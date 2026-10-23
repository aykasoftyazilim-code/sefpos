# ŞefPOS Yazıcı Ajanı

Web’den (Electron olmadan) fiş basmak için. **Bir kez kurulur**; Windows her açılışta gizli çalışır.

## Müşteri

1. Ayarlar → Fiş & Yazıcı → **ŞefPOS Yazıcı Ajanı kur (bir kez)**
2. İnen `Sefpos-PrintAgent.exe` dosyasını çalıştırın → kurulum tamam, açılışa eklenir
3. Aynı ekranda **Yazıcı ajanını bağla** (bir kez)
4. Artık PC / tarayıcı yeniden açılınca ajan kendiliğinden çalışır

Kaldırmak: kurulu klasördeki EXE’ye `--uninstall`  
`%LOCALAPPDATA%\SefPOS\PrintAgent\Sefpos-PrintAgent.exe --uninstall`

## Geliştirici

```bat
cd print-agent
npm run build
npm run publish-public
```

`public/download/Sefpos-PrintAgent.exe` → müşteri indirmesi.
