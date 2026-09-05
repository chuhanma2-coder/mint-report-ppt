// Synthetic semantic benchmark, not the mentor's missing original deck.
export function regulatoryFixture() {
  const slide={id:'regulatory',sectionId:'section-01',role:'content',outlineItem:'1',decisionUnit:'launch',storyCluster:'launch',semanticIntent:'timeline',claim:'验收时间仍不确定，备选合作并行推进',managementQuestion:'如何降低上线节奏风险？',density:'standard',evidenceRefs:[],evidenceBundle:{},
    designIntent:{dominantMessage:'验收不确定',relationshipTypes:['temporal-window','dependency','parallel'],primaryCarrier:'path',focusObjects:['验收'],focusMetrics:['+2个月']},
    visualNarrative:{pattern:'critical-path-with-parallel-options',primaryCarrier:'path',readingOrder:['takeaway','path','banks','status']},
    designRequirementRefs:['range','serial','parallel','page'],modules:[
      {id:'takeaway',type:'callout',semanticRole:'managementConclusion',primitive:'takeaway-band',text:'预期获批不等于业务上线，验收完成后才能申请服务。',evidenceRefs:[],visibleFacts:[]},
      {id:'path',type:'diagram',semanticRole:'primaryEvidence',data:{nodes:[
        {id:'license',label:'预计9月获批',status:'预测'},
        {id:'inspection',label:'验收',timeRange:{start:'11月',end:'次年1月',label:'11月至次年1月'},condition:'时间不确定'},
        {id:'application',label:'提交服务申请',duration:'+2个月'},
        {id:'option',label:'备选合作',status:'已走访，反馈积极'}
      ],edges:[{id:'e1',from:'license',to:'inspection',relationship:'dependency',label:'获批后验收'},{id:'e2',from:'inspection',to:'application',relationship:'dependency',label:'验收完成后'}],lanes:[{id:'main',label:'监管路径',nodeIds:['license','inspection','application']},{id:'alternative',label:'备选路径',nodeIds:['option'],relationship:'parallel',parallelTo:'main'}]},evidenceRefs:[],visibleFacts:[]},
      {id:'banks',type:'diagram',semanticRole:'supportingEvidence',data:{nodes:[{id:'bank-a',entity:true,label:'银行甲',metrics:['KES 688B'],text:'本地合作网络'},{id:'bank-b',entity:true,label:'银行乙',text:'数字银行与小微服务'},{id:'bank-c',entity:true,label:'银行丙',metrics:['16.9%'],text:'区域服务网络'}],edges:[]},evidenceRefs:[],visibleFacts:[]},
      {id:'status',type:'callout',semanticRole:'action',primitive:'decision-strip',text:'下一步保持两条路径同步跟进',evidenceRefs:[],visibleFacts:[]}
    ]};
  return {schemaVersion:'1.5',slideIrVersion:'1.5',planningSchemaVersion:'2.5',reportId:'synthetic',sectionId:'section-01',slides:[slide],designRequirements:[
    {id:'range',scope:'slide',slideId:slide.id,type:'temporal-window',strength:'hard',requirement:'保留验收时间窗口',targetId:'inspection',expectedText:'11月至次年1月'},
    {id:'serial',scope:'slide',slideId:slide.id,type:'dependency',strength:'hard',requirement:'验收后才能申请',from:'inspection',to:'application',targetId:'e2'},
    {id:'parallel',scope:'slide',slideId:slide.id,type:'parallel-options',strength:'hard',requirement:'备选路径并行',targetId:'alternative'},
    {id:'page',scope:'slide',slideId:slide.id,type:'single-page',strength:'hard',requirement:'只做一页'}
  ]};
}
