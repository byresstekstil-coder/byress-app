const form = document.getElementById('recordForm');
const arama = document.getElementById('arama');
const aramaSonuc = document.getElementById('aramaSonuc');
const csvBtn = document.getElementById('csvBtn');

let kayitlar = JSON.parse(localStorage.getItem('kayitlar') || '[]');

function kaydet() {
  localStorage.setItem('kayitlar', JSON.stringify(kayitlar));
  ozetGuncelle();
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const yeni = {
    tarih: document.getElementById('tarih').value,
    urun: document.getElementById('urun').value,
    sku: document.getElementById('sku').value,
    kategori: document.getElementById('kategori').value,
    alis: parseFloat(document.getElementById('alis').value) || 0,
    satis: parseFloat(document.getElementById('satis').value) || 0,
    adet: parseInt(document.getElementById('adet').value) || 0,
    odeme: parseFloat(document.getElementById('odeme').value) || 0,
    odemeKat: document.getElementById('odemeKat').value
  };
  kayitlar.push(yeni);
  kaydet();
  form.reset();
});

function ozetGuncelle() {
  const simdi = new Date();
  const haftaBas = new Date(simdi); haftaBas.setDate(simdi.getDate() - simdi.getDay());
  const ayBas = new Date(simdi.getFullYear(), simdi.getMonth(), 1);

  let haftaGelir=0, haftaGider=0, ayGelir=0, ayGider=0;
  let giderler = {};

  kayitlar.forEach(k => {
    const t = new Date(k.tarih);
    const gelir = k.satis * k.adet;
    const gider = k.alis * k.adet + k.odeme;

    if (t >= haftaBas) { haftaGelir += gelir; haftaGider += gider; }
    if (t >= ayBas) { ayGelir += gelir; ayGider += gider; }

    if (k.odemeKat) {
      giderler[k.odemeKat] = (giderler[k.odemeKat] || 0) + k.odeme;
    }
  });

  document.getElementById('haftaGelir').innerText = haftaGelir.toFixed(2);
  document.getElementById('haftaGider').innerText = haftaGider.toFixed(2);
  document.getElementById('haftaKar').innerText = (haftaGelir-haftaGider).toFixed(2);

  document.getElementById('ayGelir').innerText = ayGelir.toFixed(2);
  document.getElementById('ayGider').innerText = ayGider.toFixed(2);
  document.getElementById('ayKar').innerText = (ayGelir-ayGider).toFixed(2);

  let maxKat = "-"; let maxVal = 0;
  for (let kat in giderler) {
    if (giderler[kat] > maxVal) { maxVal = giderler[kat]; maxKat = kat; }
  }
  document.getElementById('enCokGider').innerText = maxKat;
}

arama.addEventListener('input', () => {
  const q = arama.value.toLowerCase();
  aramaSonuc.innerHTML = "";
  kayitlar.filter(k => k.urun.toLowerCase().includes(q) || k.sku.toLowerCase().includes(q))
          .forEach(k => {
            const li = document.createElement('li');
            li.className = "list-group-item";
            li.textContent = `${k.tarih} - ${k.urun} (${k.sku}) ${k.satis}₺ x${k.adet}`;
            aramaSonuc.appendChild(li);
          });
});

csvBtn.addEventListener('click', () => {
  let csv = "Tarih,Ürün,SKU,Kategori,Alış,Satış,Adet,Ödeme,ÖdemeKat\n";
  kayitlar.forEach(k => {
    csv += `${k.tarih},${k.urun},${k.sku},${k.kategori},${k.alis},${k.satis},${k.adet},${k.odeme},${k.odemeKat}\n`;
  });
  const blob = new Blob([csv], {type:"text/csv"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "byress.csv";
  a.click();
});

ozetGuncelle();
