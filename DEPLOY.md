# Deploy 2Forge CRM na Fly.io (besplatno)

## Korak 1 – Instaliraj flyctl (jednom)

Otvori PowerShell kao Administrator i pokreni:
```
iwr https://fly.io/install.ps1 -useb | iex
```
Zatvori i otvori novi PowerShell da se PATH osvježi.

## Korak 2 – Napravi besplatni Fly.io račun

```
fly auth signup
```
Otvori se browser, registriraj se (email + lozinka, bez kartice).

## Korak 3 – Kreiraj app + persistent disk (jednom)

```
cd C:\Users\DavorJustament\crm
fly launch --no-deploy
fly volumes create crm_data --region fra --size 1
```

Ako ime "2forge-crm" nije slobodno, promijeni `app = "..."` u fly.toml pa ponovi.

## Korak 4 – Deploy!

```
fly deploy
```

Build traje ~2 minute. Na kraju dobiješ URL:
**https://2forge-crm.fly.dev** (ili kako si nazvao app)

## Ažuriranje u budućnosti

Svaki put kad napraviš izmjenu u kodu, samo:
```
fly deploy
```
Podaci na /data volumenu ostaju netaknuti.
