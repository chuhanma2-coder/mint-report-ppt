// Synthetic, unrelated decision systems. Business names are data, never rules.
const text=(id,role,value)=>({id,type:'text',semanticRole:role,text:value});
const table=(id,headers,rows)=>({id,type:'table',semanticRole:'primaryEvidence',semanticIntent:'lookup',data:{headers,rows}});
const graph=(id,intent,nodes,edges)=>({id,type:'diagram',semanticRole:'primaryEvidence',semanticIntent:intent,data:{nodes,edges}});
const chart=(id,intent,data)=>({id,type:'chart',semanticRole:'primaryEvidence',semanticIntent:intent,unit:'项',data});
const entities=()=>[{id:'a',entity:true,name:'对象甲',identity:'成熟方案',primaryMetric:{value:12,unit:'项',scope:'本体'},secondaryMetrics:[{value:20,unit:'项',scope:'集团'}],characteristics:['覆盖范围较广'],status:'已验证',statusType:'positive'},
  {id:'b',entity:true,name:'对象乙',identity:'候选方案',headlineTag:'低投入',characteristics:['需验证扩展能力'],keywords:['分阶段投入'],scope:'试点范围',caveat:'不代表全面投产',status:'待验证',statusType:'pending'}];
export function domainCases() {
  const cases=[
    ['budget','预算差异来自投入结构变化','contribution',[
      chart('c','contribution',{categories:['对象甲','对象乙','其他'],series:[{name:'变动',values:[-12,-8,5]}]}),
      text('e','managementConclusion','投入合计下降15项，核心维护保持不变。'),text('r','risk','推迟投入可能延长交付周期。'),text('a','action','先确认维护范围，再调整投入顺序。')]],
    ['project','验收完成后投产，准备工作并行推进','timeline',[
      graph('path','timeline',[{id:'a',label:'预期验收',timeRange:{start:'第2周',end:'第4周',label:'第2至第4周'},milestoneState:'expected'},{id:'b',label:'投产',duration:'约1周'},{id:'c',label:'培训准备',status:'进行中',statusType:'pending'}],[{id:'ab',from:'a',to:'b',relationship:'dependency',label:'验收完成后'}]),
      text('e','managementConclusion','培训准备不替代验收，投产必须满足验收条件。')]],
    ['architecture','接入层通过接口对接外部能力','system-architecture',[
      graph('g','system-architecture',[{id:'a',label:'接入层'},{id:'b',label:'核心服务'},{id:'c',label:'外部生态'}],[{id:'ab',from:'a',to:'b',relationship:'handoff',label:'调用接口'},{id:'bc',from:'b',to:'c',relationship:'handoff',label:'交换结果'}]),text('e','boundary','各模块权限独立，失败请求回到接入层处理。')]],
    ['comparison','对象属性不同，先按适用范围选择','comparison',[
      graph('profiles','comparison',entities(),[]),text('e','decision','建议先验证候选方案的扩展能力；集团数据不能代替本体数据。')]],
    ['trend','实际进度持续提升，但尚未达到目标','trend',[
      chart('c','trend',{hasTime:true,categories:['M1','M2','M3','M4','M5','M6','M7','M8'],series:[{name:'实际',values:[12,13,13,15,17,18,19,20]},{name:'目标',values:[22,22,22,22,22,22,22,22]}]}),text('e','action','保留每期目标与实际值，后续核查差异原因。')]],
    ['risk','先控制高影响风险，再观察低影响事项','matrix',[
      table('t',['风险','可能性','影响','措施'],[['延期','中','高','分阶段验收'],['返工','低','中','抽样复核']]),text('e','risk','等级属于定性判断，不换算成伪精确概率。')]],
    ['product','两个方案的投入与覆盖存在取舍','comparison',[
      graph('profiles','comparison',entities(),[]),text('e','decision','建议在试点范围验证低投入方案，达标后再扩大。')]],
    ['process','交接需复核，异常回到处理环节','process',[
      graph('g','process',[{id:'a',label:'受理人员'},{id:'b',label:'处理人员'},{id:'c',label:'复核人员'}],[{id:'ab',from:'a',to:'b',relationship:'handoff',label:'交接材料'},{id:'bc',from:'b',to:'c',relationship:'dependency',label:'处理完毕'},{id:'cb',from:'c',to:'b',relationship:'handoff',label:'异常退回'}]),text('e','boundary','异常退回不代表所有事项必须返工。')]],
    ['sparse','本期无需新增资源','status',[text('e','managementConclusion','现有资源可支撑本期工作，下一期再复核需求。')]],
    ['dense-table','分组核对投入明细，保留期间和单位','lookup',[
      table('t',['项目','当期（项）','下期计划（项）','适用范围'],Array.from({length:12},(_,i)=>[`对象${i+1}`,String(i+5),String(i+6),'试点范围'])),text('e','boundary','下期为计划，不是已发生投入。')]]
  ];
  return cases.map(([id,claim,semanticIntent,modules],i)=>{
    const slide={id,role:'content',sectionId:'synthetic',outlineItem:String(i+1),decisionUnit:id,claim,managementQuestion:claim,semanticIntent,modules};
    if(id==='project') {
      slide.visualNarrative={pattern:'primary-with-parallel-options',primaryCarrier:'path',readingOrder:['path','e']};
      modules[0].data.lanes=[{id:'main',label:'投产路径',nodeIds:['a','b']},{id:'prepare',label:'培训准备',nodeIds:['c'],relationship:'parallel',parallelTo:'main'}];
    }
    if(['comparison','product'].includes(id)) slide.visualNarrative={pattern:'entity-comparison',primaryCarrier:'profiles',readingOrder:['profiles','e']};
    slide.scenePlan={flow:'vertical',regions:[{id:'main',role:'primary',relation:modules.length===1?'stack':'split',weight:'major',moduleIds:modules.map(m=>m.id)}],readingOrder:['main']};
    if(id==='project') slide.scenePlan.regions[0].relation='stack';
    return slide;
  });
}
