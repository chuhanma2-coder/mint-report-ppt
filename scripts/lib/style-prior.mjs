import fs from 'node:fs';
import crypto from 'node:crypto';
import {inspectPptxPackage} from './pptx-metadata.mjs';
const hex = /^#[0-9a-f]{6}$/i;
const luminance = c => c.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
const contrast = (a,b) => (Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);

export async function extractStylePrior(file) {
  const pkg=await inspectPptxPackage(file), part=Object.keys(pkg.zip.files).find(p=>/^ppt\/theme\/theme\d+\.xml$/.test(p));
  if(!part) throw new Error('STYLE_THEME_MISSING: a native PPT theme is required');
  const xml=await pkg.zip.file(part).async('string');
  const color=key=>{const body=xml.match(new RegExp(`<a:${key}>([\\s\\S]*?)<\\/a:${key}>`))?.[1];const value=body?.match(/(?:val|lastClr)="([0-9A-Fa-f]{6})"/)?.[1];return value?'#'+value:null;};
  const fonts=[...xml.matchAll(/<a:(?:latin|ea)\b[^>]*typeface="([^"]+)"/g)].map(m=>m[1]).filter(Boolean);
  const sizes=pkg.mintTextObjects.flatMap(o=>Number.isFinite(o.minimumFontPt)?[o.minimumFontPt]:[]);
  return {kind:'mint-style-prior',version:1,approved:false,sourceHash:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),palette:Object.fromEntries([['ink',color('dk1')],['page',color('lt1')],['blue',color('accent1')],['mint',color('accent2')],['orange',color('accent3')]].filter(([,v])=>v)),observations:{fonts:[...new Set(fonts)],nativeFontSizesPt:sizes,unsupported:['content-slots','page-geometry','automatic-timeline-style','automatic-margin-inference']}};
}

export function applyStylePrior(base, profile) {
  if(!profile) return base;
  if(profile.kind!=='mint-style-prior'||profile.version!==1||profile.approved!==true) throw new Error('STYLE_REVIEW_REQUIRED: inspect the reference and explicitly approve the profile');
  const allowed=['ink','page','blue','mint','orange'];
  for(const [key,value] of Object.entries(profile.palette || {})) if(!allowed.includes(key)||!hex.test(value)) throw new Error(`STYLE_TOKEN_INVALID: ${key}`);
  if(profile.slots || profile.geometry || profile.layout) throw new Error('STYLE_CONTENT_SLOTS_FORBIDDEN');
  const theme=structuredClone(base);theme.palette={...theme.palette,...profile.palette};
  if(profile.fonts) {
    if(Object.keys(profile.fonts).some(k=>!['cjk','latin'].includes(k)) || Object.values(profile.fonts).some(v=>typeof v!=='string'||!v.trim()||/[<>;{}]/.test(v))) throw new Error('STYLE_FONT_INVALID');
    theme.fonts={...theme.fonts,...profile.fonts};
  }
  for(const [role,range] of Object.entries(profile.typographyPt || {})) {
    const original=base.typographyPt[role];
    if(!original||!Array.isArray(range)||range.length!==2||range.some(n=>!Number.isFinite(n))||range[0]<original[0]||range[1]<range[0]||range[1]>original[1]) throw new Error(`STYLE_READABILITY_FLOOR: ${role}`);
    theme.typographyPt[role]=range;
  }
  if(contrast(theme.palette.ink,theme.palette.page)<4.5) throw new Error('STYLE_CONTRAST_FAILED: body text');
  if(contrast(theme.palette.ink,'#FFFFFF')<4.5) throw new Error('STYLE_CONTRAST_FAILED: takeaway');
  theme.semanticColors.actual=theme.palette.mint;
  return theme;
}
