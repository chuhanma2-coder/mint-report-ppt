import {theme} from './config.mjs';
export function textRole({name='',className='',primitiveParent='',kind='',role='',tableCell=false}={}) {
  const value=`${name} ${className} ${primitiveParent}`;
  const explicit=name.match(/\|text-role:(table|caption|diagramEdge|diagramNode|chartLabel|chartValue|supportBody|denseBody)(?:\||$)/)?.[1];
  if(explicit) return explicit;
  if(tableCell||kind==='table') return 'table';
  if(/caption/.test(value)) return 'caption';
  if(/edge-label|dependency-edge/.test(value)) return 'diagramEdge';
  if(/diagram-node|diagram-isolated-node|profile-identity/.test(value)) return 'diagramNode';
  if(/chartValue/.test(value)) return 'chartValue';
  if(/chart.*label/.test(value)||kind==='chart') return 'chartLabel';
  if(/role:(context|supportingEvidence|boundary)|question/.test(value)||['context','supportingEvidence','boundary'].includes(role)) return 'supportBody';
  return 'denseBody';
}
export function textFloorPt(object,tokens=theme) { const role=textRole(object);return role==='chartValue'?tokens.chartTypographyPt.denseDataLabel:tokens.typographyPt[role][0]; }
