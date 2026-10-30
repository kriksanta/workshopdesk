let invoicePdfReady=null,invoicePdfLibrary=null;
function invoicePdfFilename(i){return (i.kind==='spare-parts'?'Spare-parts-bill':i.type)+'-'+String(i.id).replace(/[^a-zA-Z0-9_-]/g,'-')+'.pdf';}
function clearInvoicePdf(){if(invoicePdfReady?.url)URL.revokeObjectURL(invoicePdfReady.url);invoicePdfReady=null;}
function loadInvoicePdfLibrary(){
 if(typeof window.html2pdf==='function')return Promise.resolve();
 if(!invoicePdfLibrary)invoicePdfLibrary=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='vendor/html2pdf.bundle.min.js';script.onload=resolve;script.onerror=()=>{invoicePdfLibrary=null;script.remove();reject(new Error('Could not load PDF export. Check your connection and try again.'));};document.head.append(script);});
 return invoicePdfLibrary;
}
async function createInvoicePdf(i){
 await loadInvoicePdfLibrary();
 const wrapper=document.createElement('div');wrapper.className='pdf-export';wrapper.innerHTML=billDocument(i);document.body.append(wrapper);
 try{if(document.fonts?.ready)await document.fonts.ready;await Promise.all([...wrapper.querySelectorAll('img')].map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;})));
 const blob=await window.html2pdf().set({margin:10,filename:invoicePdfFilename(i),image:{type:'jpeg',quality:.96},html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff',windowWidth:794,scrollX:0,scrollY:0},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},enableLinks:false,pagebreak:{mode:['css','legacy'],avoid:['tr','.doc-header','.doc-details','.doc-total','.doc-sign']}}).from(wrapper.firstElementChild).outputPdf('blob');
 return new File([blob],invoicePdfFilename(i),{type:'application/pdf'});
 }finally{wrapper.remove();}
}
function invoicePdfIsCurrent(){return !!(invoicePdfReady&&session?.admin&&role==='employer'&&invoicePdfReady.workshop===session.workshopId&&state.invoices.some(i=>i.id===invoicePdfReady.id));}
function canShareInvoicePdf(file){try{return !!(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]}));}catch{return false;}}
function downloadReadyInvoicePdf(){if(!invoicePdfIsCurrent())throw new Error('Open this document again to prepare its PDF.');const a=document.createElement('a');a.href=invoicePdfReady.url;a.download=invoicePdfReady.file.name;document.body.append(a);a.click();a.remove();}
async function prepareInvoicePdf(id,button){
 if(!session?.admin||role!=='employer')return;const invoice=state.invoices.find(i=>i.id===id);if(!invoice)return;
 const workshop=session.workshopId;button.disabled=true;const previous=button.textContent;button.textContent='Preparing PDF...';
 try{const file=await createInvoicePdf(invoice);if(!session?.admin||session.workshopId!==workshop||!state.invoices.some(i=>i.id===id))return;
 clearInvoicePdf();const buyer=invoiceCustomer(invoice);invoicePdfReady={id,workshop,file,url:URL.createObjectURL(file),phone:String(buyer.phone||'').replace(/\D/g,''),message:'Hello '+buyer.name+', please find your '+(invoice.kind==='spare-parts'?'spare-parts bill':invoice.type.toLowerCase())+' '+invoice.id+' from '+state.settings.name+'.'};
 const native=canShareInvoicePdf(file);
 openModal('PDF ready to share',`<p><strong>${esc(file.name)}</strong></p><p class="notice-inline">${native?'Tap Share PDF, choose WhatsApp and select the customer to send this file.':'Download the PDF, then open WhatsApp and attach the downloaded file to the customer chat.'}</p><p class="notice-inline">${buyer.phone?'Customer: '+esc(buyer.name)+' - '+esc(buyer.phone):'No customer phone is saved. Select the recipient in WhatsApp.'}</p>`,btn('Back to document','invoice-preview','','light',`data-id="${esc(id)}"`)+btn('Download PDF','download-invoice-pdf','download','light')+btn(native?'Share PDF':'Download & open WhatsApp',native?'native-share-invoice-pdf':'whatsapp-attach-invoice-pdf','chat','primary'));
 }catch(e){toast(e.message||'Could not create the PDF. Try Print / Save PDF instead.');}
 finally{if(button.isConnected){button.disabled=false;button.textContent=previous;}}
}
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-action]');if(!b)return;const action=b.dataset.action;
 if(action==='logout'||action==='platform-logout'){clearInvoicePdf();return;}
 if(action==='share-invoice-pdf'){if(!b.disabled)await prepareInvoicePdf(b.dataset.id,b);return;}
 if(!['download-invoice-pdf','native-share-invoice-pdf','whatsapp-attach-invoice-pdf'].includes(action))return;
 try{if(!invoicePdfIsCurrent())throw new Error('Open this document again to prepare its PDF.');
 if(action==='download-invoice-pdf'){downloadReadyInvoicePdf();return;}
 if(action==='native-share-invoice-pdf'){await navigator.share({files:[invoicePdfReady.file],title:invoicePdfReady.file.name});return;}
 downloadReadyInvoicePdf();const phone=/^\d{10,15}$/.test(invoicePdfReady.phone)?invoicePdfReady.phone:'';window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(invoicePdfReady.message),'_blank','noopener,noreferrer');toast('Attach the downloaded PDF in WhatsApp, then send it.');
 }catch(error){if(error.name!=='AbortError')toast(error.message||'Sharing was unavailable. Use Download PDF and attach the file in WhatsApp.');}
});
