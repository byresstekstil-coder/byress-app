
const LS_KEY="byress_records_v2";
const LS_PIN="byress_pin_v2";
const LS_SETTINGS="byress_settings_v2";
const $=sel=>document.querySelector(sel);
const fmt=n=>(n||0).toLocaleString('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:2});
const todayISO=()=>new Date().toISOString().slice(0,10);
const startOfWeek=(d)=>{const x=new Date(d);const day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);return x.toISOString().slice(0,10);};
const monthKey=d=>(d||'').slice(0,7);
const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);

function load(){try{return JSON.parse(localStorage.getItem(LS_KEY)||"[]");}catch(e){return [];}}
function save(rows){localStorage.setItem(LS_KEY,JSON.stringify(rows));}
function getSettings(){
  try{return JSON.parse(localStorage.getItem(LS_SETTINGS)||"{}");}catch(e){return {};}
}
function setSettings(s){localStorage.setItem(LS_SETTINGS,JSON.stringify(s));}

function ensureDefaults(){
  const s=getSettings();
  if(!Array.isArray(s.catList)){
    s.catList=["Tişört","Gömlek","Sweatshirt","Hırka","Mont","Pantolon","Eşofman","Elbise","Etek","Şort","Çocuk","Aksesuar","Şapka","Çorap","İç Giyim","Beden: XS/S/M/L/XL"];
  }
  if(!Array.isArray(s.expCatList)){
    s.expCatList=["Kira","Elektrik","Su","İnternet","Maaş","Vergi/SGK","POS Komisyonu","Kargo","Paketleme","Temizlik","Bakım-Onarım","Reklam","Muhasebe","Lisans/Abonelik","Diğer"];
  }
  if(!Array.isArray(s.payList)){
    s.payList=["Nakit","POS","Veresiye","Transfer","Kapıda Ödeme"];
  }
  if(!s.kdvMap){
    s.kdvMap={"Tişört":20,"Gömlek":20,"Sweatshirt":20,"Mont":20,"Pantolon":20,"Aksesuar":20,"Çocuk":10};
  }
  if(!Array.isArray(s.partyList)){ s.partyList=[]; }
  if(!s.low){ s.low=3; }
  setSettings(s);
  fillDatalists();
  // apply defaults to controls
  $("#sLow").value=s.low;
}
function fillDatalists(){
  const s=getSettings();
  const fill=(id,arr)=>{ const dl=$(id); dl.innerHTML=""; arr.forEach(v=>{ const o=document.createElement("option"); o.value=v; dl.appendChild(o); }); };
  fill("#dlCat", s.catList||[]);
  fill("#dlExpCat", s.expCatList||[]);
  fill("#dlPay", s.payList||[]);
  fill("#dlParty", s.partyList||[]);
}

// auto add to list when new value entered
function autoAddToList(listName, val){
  val=(val||"").trim(); if(!val) return;
  const s=getSettings(); const arr=s[listName] || [];
  if(!arr.includes(val)){ arr.push(val); s[listName]=arr; setSettings(s); fillDatalists(); renderChips(); }
}

function renderChips(){
  const s=getSettings();
  const mk=(arr,el,listName)=>{ el.innerHTML=""; arr.forEach(v=>{ const c=document.createElement("div"); c.className="chip"; c.textContent=v; c.title="Sil"; c.onclick=()=>{ const ss=getSettings(); ss[listName]=ss[listName].filter(x=>x!==v); setSettings(ss); fillDatalists(); renderChips(); }; el.appendChild(c); }); };
  mk(s.catList||[],$("#chipsCat"),"catList");
  mk(s.expCatList||[],$("#chipsExp"),"expCatList");
  mk(s.payList||[],$("#chipsPay"),"payList");
}

// hesap
function hesapla(r){
  const net=Math.max((+r.satilanAdet||0)-(+r.iadeAdet||0),0);
  const alis=+r.alisFiyati||0, satis=+r.satisFiyati||0, isk=+r.iskontoPct||0, kdv=+r.kdvPct||0;
  const brut=net*satis, iskTutar=brut*(isk/100);
  const gelirEx=brut-iskTutar, maliyetEx=net*alis, karEx=gelirEx-maliyetEx;
  const gelirInc=net*(satis*(1+kdv/100))-(iskTutar*(1+kdv/100));
  const maliyetInc=net*(alis*(1+kdv/100)); const karInc=gelirInc-maliyetInc;
  return {net, gelirEx, maliyetEx, karEx, gelirInc, maliyetInc, karInc};
}

function addRecordObj(r){const rows=load(); rows.unshift(r); save(rows);}

// events
["#fCat","#fExpCat","#fPay","#fParty"].forEach(sel=>{
  $(sel).addEventListener("change", (e)=>{
    const id=e.target.id;
    if(id==="fCat"){ // auto KDV by category
      const s=getSettings(); const v=e.target.value.trim(); if(s.kdvMap && s.kdvMap[v]!=null){ $("#fKDV").value=s.kdvMap[v]; }
      autoAddToList("catList", v);
    }
    if(id==="fExpCat"){ autoAddToList("expCatList", e.target.value); }
    if(id==="fPay"){ autoAddToList("payList", e.target.value); }
    if(id==="fParty"){ autoAddToList("partyList", e.target.value); }
  });
});

$("#fCat").addEventListener("blur", ()=>autoAddToList("catList", $("#fCat").value));
$("#fExpCat").addEventListener("blur", ()=>autoAddToList("expCatList", $("#fExpCat").value));
$("#fPay").addEventListener("blur", ()=>autoAddToList("payList", $("#fPay").value));
$("#fParty").addEventListener("blur", ()=>autoAddToList("partyList", $("#fParty").value));

async function addRecord(){
  let rec={
    id: uid(), tarih: ($("#fDate").value||todayISO()).slice(0,10), tur: $("#fType").value,
    urunAdi: $("#fName").value, sku: $("#fSKU").value, kategori: $("#fCat").value,
    gelenAdet:+$("#fIn").value||0, satilanAdet:+$("#fOut").value||0, iadeAdet:+$("#fReturn").value||0,
    alisFiyati:+$("#fBuy").value||0, satisFiyati:+$("#fSell").value||0, iskontoPct:+$("#fDisc").value||0, kdvPct:+$("#fKDV").value||0,
    odemeYontemi: $("#fPay").value, taraf: $("#fParty").value, aciklama: $("#fNote").value,
    odemeKategori: $("#fExpCat").value, odemeTutar: +$("#fExpAmt").value||0
  };

  // --- Normalize quantities by type ---
  if(rec.tur==="Alış"){
    // If user filled Satılan instead of Gelen, map it
    if((+rec.gelenAdet||0)===0 && (+rec.satilanAdet||0)>0){ rec.gelenAdet = +rec.satilanAdet; }
    rec.satilanAdet = 0; // purchases shouldn't record sales here
  } else if(rec.tur==="Satış"){
    if((+rec.satilanAdet||0)===0 && (+rec.gelenAdet||0)>0){ rec.satilanAdet = +rec.gelenAdet; }
    rec.gelenAdet = 0;
  } else if(rec.tur==="İade"){
    // Returns add back to stock; keep iadeAdet as entered
    if((+rec.iadeAdet||0)===0){
      // tolerate users who typed into gelen/satilan fields
      rec.iadeAdet = (+rec.gelenAdet||0) || (+rec.satilanAdet||0);
    }
    rec.gelenAdet = 0; rec.satilanAdet = 0;
  }
  // Ensure numeric cleanup
  rec.gelenAdet=+rec.gelenAdet||0; rec.satilanAdet=+rec.satilanAdet||0; rec.iadeAdet=+rec.iadeAdet||0;

  addRecordObj(rec);
  const s=getSettings(); if(s.autoSync && s.webhook){ try{ fetch(s.webhook,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...rec, hesap:hesapla(rec)})}); }catch(e){} }
  ["#fName","#fSKU","#fCat","#fParty","#fExpCat","#fNote"].forEach(sel=>$(sel).value="");
  ["#fIn","#fOut","#fReturn","#fBuy","#fSell","#fDisc","#fExpAmt"].forEach(sel=>$(sel).value=0);
  $("#fDate").value=todayISO(); $("#fType").value="Satış"; $("#fPay").value=""; $("#fKDV").value=20;
  renderAll();
}

// CSV
function exportCSV(rows){
  const headers=["id","tarih","tur","urunAdi","sku","kategori","gelenAdet","satilanAdet","iadeAdet","alisFiyati","satisFiyati","iskontoPct","kdvPct","odemeYontemi","taraf","aciklama","odemeKategori","odemeTutar","netSatilan","gelirEx","maliyetEx","karEx","gelirInc","maliyetInc","karInc"];
  const lines=rows.map(r=>{const h=hesapla(r);return [r.id,r.tarih,r.tur,r.urunAdi||"",r.sku||"",r.kategori||"",r.gelenAdet||0,r.satilanAdet||0,r.iadeAdet||0,r.alisFiyati||0,r.satisFiyati||0,r.iskontoPct||0,r.kdvPct||0,r.odemeYontemi||"",r.taraf||"", (r.aciklama||"").replace(/\\n/g," "), r.odemeKategori||"",r.odemeTutar||0, h.net,h.gelirEx,h.maliyetEx,h.karEx,h.gelirInc,h.maliyetInc,h.karInc].join(";");});
  const csv="\\ufeff"+[headers.join(";"),...lines].join("\\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
  const a=document.createElement("a"); a.href=url; a.download="byress_kayit.csv"; a.click(); URL.revokeObjectURL(url);
}
function downloadCSV(){exportCSV(load());}
function importCSV(text){
  const lines=text.split(/\\r?\\n/).filter(Boolean); lines.shift();
  const out=load();
  lines.forEach(l=>{const c=l.split(";"); if(c.length<10)return;
    out.push({id:c[0],tarih:c[1],tur:c[2],urunAdi:c[3],sku:c[4],kategori:c[5],gelenAdet:+c[6]||0,satilanAdet:+c[7]||0,iadeAdet:+c[8]||0,alisFiyati:+c[9]||0,satisFiyati:+c[10]||0,iskontoPct:+c[11]||0,kdvPct:+c[12]||0,odemeYontemi:c[13],taraf:c[14],aciklama:c[15],odemeKategori:c[16],odemeTutar:+c[17]||0});
  }); save(out); renderAll();
}

// Summary
function summarize(range){
  const rows=load(); const today=todayISO(); const ws=startOfWeek(today); const mk=monthKey(today);
  let gelir=0,gider=0; rows.forEach(r=>{
    const t=(r.tarih||"").slice(0,10);
    if(range==='week' && !(t>=ws && t<=today)) return;
    if(range==='month' && monthKey(t)!==mk) return;
    if(r.tur==="Ödeme"){ gider+= (+r.odemeTutar||0); }
    else{ const h=hesapla(r); gelir+=h.gelirEx; gider+=h.maliyetEx; }
  });
  return {gelir,gider,kar:gelir-gider};
}

function renderHomeSummary(){
  const w=summarize('week'); $("#weekLine").textContent=`Gelir: ${fmt(w.gelir)} • Gider: ${fmt(w.gider)} • Kâr: ${fmt(w.kar)}`;
  const m=summarize('month'); $("#monthLine").textContent=`Gelir: ${fmt(m.gelir)} • Gider: ${fmt(m.gider)} • Kâr: ${fmt(m.kar)}`;
}

function renderSearch(){
  const rows=load(); const q=($("#q").value||"").toLowerCase().trim(); const list=$("#list"); list.innerHTML="";
  rows.filter(r=> !q || (r.urunAdi||"").toLowerCase().includes(q) || (r.sku||"").toLowerCase().includes(q))
      .slice(0,200).forEach(r=>{
        const h=hesapla(r); const isPay=r.tur==="Ödeme";
        const div=document.createElement('div'); div.className="item";
        div.innerHTML=isPay?`<div><strong>ÖDEME • ${r.odemeKategori||'-'}</strong> <span class="small">(${r.tarih})</span>
           <span class="badge" style="float:right">-${fmt(r.odemeTutar||0)}</span></div>
           <div class="small">${r.odemeYontemi||'-'} • ${r.aciklama||''}</div>`
           :`<div><strong>${r.urunAdi||'-'}</strong> <span class="small">(${r.sku||'-'})</span>
           <span class="badge" style="float:right">${fmt(h.karEx)} kâr</span></div>
           <div class="small">${r.tarih} • ${r.tur} • ${r.kategori||'-'} • ${r.odemeYontemi||'-'}</div>`;
        list.appendChild(div);
      });
}


function renderStock(){
  const rows=load(); const q=($("#stockQ").value||"").toLowerCase().trim();
  const map={}; // key -> aggregate
  rows.forEach(r=>{
    const key = (r.sku && r.sku.trim()) ? r.sku.trim() : ((r.urunAdi&&r.urunAdi.trim())? r.urunAdi.trim() : null);
    if(!key) return;
    if(!map[key]) map[key]={name:r.urunAdi||"",sku:r.sku||"",in:0,sold:0,ret:0,buySum:0,buyQty:0,lastSell:0};
    // Interpret by type for robustness
    if(r.tur==="Alış"){
      const g=+r.gelenAdet||(+r.satilanAdet||0);
      if(g){ map[key].in += g; map[key].buySum += (+r.alisFiyati||0)*g; map[key].buyQty += g; }
    } else if(r.tur==="Satış"){
      const s=+r.satilanAdet||(+r.gelenAdet||0);
      if(s){ map[key].sold += s; if(+r.satisFiyati) map[key].lastSell = +r.satisFiyati; }
    } else if(r.tur==="İade"){
      const rt=+r.iadeAdet||(+r.gelenAdet||+r.satilanAdet||0);
      if(rt){ map[key].ret += rt; }
    } else {
      // Ödeme: stok yok
    }
  });
  const tbody=$("#stockTable tbody"); tbody.innerHTML="";
  let lowList=[]; const lowThreshold=+(getSettings().low||3);
  Object.entries(map).forEach(([key,m])=>{
    const stok = (m.in - m.sold + m.ret);
    if(!q || (m.name||'').toLowerCase().includes(q) || (m.sku||'').toLowerCase().includes(q) || key.toLowerCase().includes(q)){
      const tr=document.createElement('tr'); if(stok<=lowThreshold) tr.style.background="#fff7f7"; if(stok<0) tr.style.outline="2px solid #f00";
      const avg = m.buyQty? (m.buySum/m.buyQty): 0;
      tr.innerHTML=`<td>${m.name||'-'}</td><td>${m.sku||key}</td><td class="right">${stok}</td><td class="right">${fmt(avg)}</td><td class="right">${fmt(m.lastSell)}</td>`;
      tbody.appendChild(tr);
      if(stok<=lowThreshold) lowList.push(`${m.sku||key} (${stok})`);
    }
  });
  $("#lowStockMsg").textContent = lowList.length? `Düşük stok: ${lowList.join(', ')}` : "";
}
;
  rows.forEach(r=>{
    if(!r.sku) return;
    if(!map[r.sku]) map[r.sku]={name:r.urunAdi||"",sku:r.sku,in:0,sold:0,ret:0,buySum:0,buyQty:0,lastSell:0};
    if(r.gelenAdet){ map[r.sku].in+=+r.gelenAdet; map[r.sku].buySum+=(+r.alisFiyati||0)*(+r.gelenAdet||0); map[r.sku].buyQty+=(+r.gelenAdet||0); }
    if(r.satilanAdet){ map[r.sku].sold+=+r.satilanAdet; map[r.sku].lastSell=(+r.satisFiyati||map[r.sku].lastSell); }
    if(r.iadeAdet){ map[r.sku].ret+=+r.iadeAdet; }
  });
  const tbody=$("#stockTable tbody"); tbody.innerHTML="";
  let lowList=[]; const lowThreshold=+(getSettings().low||3);
  Object.values(map).forEach(m=>{
    const stok=(m.in-m.sold+m.ret);
    if(!q || m.name.toLowerCase().includes(q) || m.sku.toLowerCase().includes(q)){
      const tr=document.createElement('tr'); if(stok<=lowThreshold) tr.style.background="#fff7f7";
      const avg=m.buyQty? (m.buySum/m.buyQty):0;
      tr.innerHTML=`<td>${m.name||'-'}</td><td>${m.sku}</td><td class="right">${stok}</td><td class="right">${fmt(avg)}</td><td class="right">${fmt(m.lastSell)}</td>`;
      tbody.appendChild(tr);
      if(stok<=lowThreshold) lowList.push(`${m.sku} (${stok})`);
    }
  });
  $("#lowStockMsg").textContent = lowList.length? `Düşük stok: ${lowList.join(', ')}` : "";
}

function drawBarChart(canvas, data){
  const ctx=canvas.getContext('2d'); const W=canvas.width=canvas.clientWidth; const H=canvas.height=canvas.clientHeight;
  ctx.clearRect(0,0,W,H); const pad=30; const max=Math.max(1,...data.map(d=>d.v));
  const barW=(W-pad*2)/data.length*0.6; const step=(W-pad*2)/data.length;
  ctx.strokeStyle="#e5e7eb"; ctx.beginPath(); ctx.moveTo(pad, H-pad); ctx.lineTo(W-pad, H-pad); ctx.stroke();
  data.forEach((d,i)=>{ const h=(H-pad*2)*(d.v/max); const x=pad+i*step+(step-barW)/2; const y=H-pad-h; ctx.fillStyle="#0d5c49"; ctx.fillRect(x,y,barW,h); ctx.fillStyle="#475569"; ctx.font="12px system-ui"; ctx.fillText(d.k, x, H-pad+14); });
}

function renderReport(){
  const rows=load(); const from=$("#rFrom").value, to=$("#rTo").value || todayISO(); const typ=$("#rType").value;
  const filt=rows.filter(r=>{const t=(r.tarih||"").slice(0,10); if(from && t<from) return false; if(to && t>to) return false; if(typ && r.tur!==typ) return false; return true;});
  const map={}; filt.forEach(r=>{const t=(r.tarih||"").slice(0,10); if(!map[t]) map[t]={gelir:0,gider:0}; if(r.tur==="Ödeme"){map[t].gider+=(+r.odemeTutar||0);} else{const h=hesapla(r); map[t].gelir+=h.gelirEx; map[t].gider+=h.maliyetEx;}});
  const arr=Object.entries(map).sort((a,b)=>a[0]<b[0]?-1:1).map(([k,v])=>({k, v: Math.max(v.gelir - v.gider,0)}));
  drawBarChart($("#chartIncome"), arr.length?arr:[{k:todayISO(),v:0}]);

  // top tables
  let expMap={}, prodMap={}; filt.forEach(r=>{ if(r.tur==="Ödeme"){ const k=r.odemeKategori||"Diğer"; expMap[k]=(expMap[k]||0)+(+r.odemeTutar||0);} else{ const h=hesapla(r); const key=r.urunAdi||r.sku||"Diğer"; prodMap[key]=(prodMap[key]||0)+h.karEx; } });
  const topExp=Object.entries(expMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const topProd=Object.entries(prodMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const expT=$("#topExp tbody"); expT.innerHTML=""; topExp.forEach(([k,v])=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${k}</td><td class="right">${fmt(v)}</td>`; expT.appendChild(tr); });
  const prodT=$("#topProd tbody"); prodT.innerHTML=""; topProd.forEach(([k,v])=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${k}</td><td class="right">${fmt(v)}</td>`; prodT.appendChild(tr); });
}

// Settings
function saveSettings(){ const s=getSettings(); s.webhook=$("#sWebhook").value.trim(); s.autoSync=$("#sAuto").value==="1"; s.low=+$("#sLow").value||3; setSettings(s); alert("Kaydedildi"); }
function savePIN(){ const v=$("#sPin").value.trim(); if(v.length<4){ alert("PIN en az 4 hane"); return;} localStorage.setItem(LS_PIN,btoa(v)); alert("PIN güncellendi"); $("#sPin").value=""; }
function resetPIN(){ localStorage.removeItem(LS_PIN); alert("PIN sıfırlandı. Açılışta yeni PIN belirle."); try{ if(localStorage.getItem(LS_PIN)){ showPIN(); } }catch(e){ showPIN(); } }

function backupJSON(){ const data={records:load(),settings:getSettings()}; const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:"application/json"})); const a=document.createElement("a"); a.href=url; a.download="byress_backup.json"; a.click(); URL.revokeObjectURL(url); }
function restoreJSON(){ const inp=document.createElement("input"); inp.type="file"; inp.accept="application/json"; inp.onchange=()=>{ const f=inp.files[0]; const fr=new FileReader(); fr.onload=()=>{ try{const data=JSON.parse(fr.result); if(data.records) save(data.records); if(data.settings) setSettings(data.settings); ensureDefaults(); renderAll(); alert("Yükleme tamam");}catch(e){alert("Geçersiz dosya");}}; fr.readAsText(f); }; inp.click(); }

// Tabs
document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>{ document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active")); btn.classList.add("active"); const v=btn.getAttribute("data-tab"); document.querySelectorAll(".tabpane").forEach(p=>p.style.display="none"); $("#"+v).style.display="block"; if(v==="stock") renderStock(); if(v==="report") renderReport(); if(v==="search") renderSearch(); if(v==="home") renderHomeSummary(); }));

// PIN
function showPIN(){ $("#pinModal").style.display="flex"; $("#pinInput").focus(); }
function hidePIN(){ $("#pinModal").style.display="none"; }

function confirmPIN(){ 
  const stored=localStorage.getItem(LS_PIN); 
  const val=$("#pinInput").value.trim(); 
  if(!stored){ 
    // first run: if user leaves empty, set default 0000
    const setTo = val.length>=4 ? val : "0000";
    localStorage.setItem(LS_PIN,btoa(setTo)); 
    alert("PIN ayarlandı: " + (val.length>=4? "••••" : "0000 (varsayılan)")); 
    hidePIN(); 
  } else { 
    if(btoa(val)===stored){ hidePIN(); } else { alert("PIN hatalı"); } 
  } 
}
// Enter key shortcut
$("#pinInput").addEventListener("keydown",(e)=>{ if(e.key==="Enter"){ confirmPIN(); } });

// Barcode
async function startScan(){ try{ if(!window.BrowserMultiFormatReader){ alert("Tarayıcı hazır değil"); return; } const codeReader=new window.BrowserMultiFormatReader(); const preview=document.createElement("video"); preview.setAttribute("playsinline","true"); const box=document.createElement("div"); box.className="card"; box.innerHTML="<b>Barkod Tara</b>"; box.appendChild(preview); $("#home").insertBefore(box,$("#home").firstChild); codeReader.decodeFromVideoDevice(undefined, preview,(result,err)=>{ if(result){ $("#fSKU").value=result.getText(); codeReader.reset(); box.remove(); } }); }catch(e){ alert("Kamera izni verilmedi"); } }

// Bindings
$("#addBtn").addEventListener("click", addRecord);
$("#csvBtn").addEventListener("click", ()=>exportCSV(load()));
$("#importBtn").addEventListener("click", ()=>{ const inp=document.createElement("input"); inp.type="file"; inp.accept=".csv,text/csv"; inp.onchange=()=>{ const f=inp.files[0]; const fr=new FileReader(); fr.onload=()=>importCSV(fr.result); fr.readAsText(f); }; inp.click(); });
$("#q").addEventListener("input", renderSearch);
$("#stockQ").addEventListener("input", renderStock);
$("#scanBtn").addEventListener("click", startScan);

// Defaults
$("#fDate").value=todayISO();
ensureDefaults();
renderChips();
renderAll();

if('serviceWorker' in navigator){ window.addEventListener('load', ()=>navigator.serviceWorker.register('/service-worker.js')); }
try{ if(localStorage.getItem(LS_PIN)){ showPIN(); } }catch(e){ showPIN(); }

function renderAll(){ renderHomeSummary(); if($("#search").style.display!=="none") renderSearch(); if($("#stock").style.display!=="none") renderStock(); if($("#report").style.display!=="none") renderReport(); }
