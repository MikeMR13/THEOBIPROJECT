// El iframe de 390px comprueba CSS y eventos a ancho móvil real en Chromium.
addEventListener('message',event=>{
  if(event.origin!==location.origin || event.source!==document.getElementById('qa-frame')?.contentWindow)return;
  if(event.data?.qa!=='studio-browser')return;
  const el=document.getElementById('qa-result');
  el.dataset.qaStatus=event.data.status;
  el.textContent=event.data.text+' (iframe móvil 390px)';
});