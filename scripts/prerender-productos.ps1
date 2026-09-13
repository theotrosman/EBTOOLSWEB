# ===== EBTOOLS — Pre-render de páginas de producto =====
# Genera /producto/<id>.html (HTML estático, crawleable sin JS) para CADA
# producto activo de Supabase, y regenera sitemap.xml.
#
# Cuándo correrlo: después de agregar o editar productos en el panel, para que
# los buscadores y las IAs vean el contenido actualizado.
#
# Uso:  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\prerender-productos.ps1
#
# Nota: los literales de texto usan entidades HTML (&mdash;, &eacute;, ...) a
# propósito, para no depender de la codificación con que se lea este archivo.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)

$SUPA = 'https://orrvqtrjvzksvgstkjle.supabase.co/rest/v1'
$KEY  = 'sb_publishable_HdN7h-7jwukoaRFIDI6vWg_Nhg7Q1Z5'  # anon/publishable: pública por diseño
$headers = @{ apikey = $KEY; Authorization = "Bearer $KEY" }
$base = 'https://ebtools.com.ar'
$WA = '5491171349389'

Write-Host 'Descargando productos y categorías de Supabase...'
$products = Invoke-RestMethod -Uri "$SUPA/products?select=id,name,slug,cats,subcats,img,short,descr,images,active&active=eq.true&order=sort" -Headers $headers
$cats     = Invoke-RestMethod -Uri "$SUPA/categories?select=key,label" -Headers $headers
$catMap = @{}
foreach($c in $cats){ $catMap[$c.key] = $c.label }

function Esc($s){ if($null -eq $s){return ''}; return ([string]$s).Replace('&','&amp;').Replace('<','&lt;').Replace('>','&gt;').Replace('"','&quot;') }
function JsonStr($s){ if($null -eq $s){return ''}; return ([string]$s).Replace('\','\\').Replace('"','\"').Replace("`r",'').Replace("`n",' ').Replace("`t",' ') }

$outDir = Join-Path $root 'producto'
if(-not (Test-Path $outDir)){ New-Item -ItemType Directory -Path $outDir | Out-Null }
$count = 0

foreach($p in $products){
  $id = $p.id
  $name = [string]$p.name
  $descr = if($p.descr){ [string]$p.descr } else { [string]$p.short }
  $short = if($p.short){ [string]$p.short } else { $descr }
  $img = if($p.img){ [string]$p.img } else { "$base/assets/logo.png" }
  $catLabels = @()
  foreach($k in @($p.cats)){ if($catMap.ContainsKey($k)){ $catLabels += $catMap[$k] } else { $catLabels += $k } }
  $catLabelStr = ($catLabels -join ' &middot; ')
  $primaryCat = if($catLabels.Count -gt 0){ $catLabels[0] } else { 'Productos' }
  $url = "$base/producto/$id"
  $metaDesc = $short; if($metaDesc.Length -gt 200){ $metaDesc = $metaDesc.Substring(0,197) + '...' }
  $waLink = "https://wa.me/$WA`?text=" + [uri]::EscapeDataString("Hola! Quiero consultar por $name")
  $descHtml = (Esc $descr).Replace("`r",'').Replace("`n",'<br>')

  $imgArr = @("`"$(JsonStr $img)`"")
  if($p.images){ foreach($im in $p.images){ if($im){ $imgArr += "`"$(JsonStr $im)`"" } } }
  $imgJson = '[' + ($imgArr -join ',') + ']'
  $nameJson = JsonStr $name; $descrJson = JsonStr $descr; $breadcrumbName = JsonStr $primaryCat

  $html = @"
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>$(Esc $name) &mdash; EBTOOLS (El Bahiense)</title>
  <meta name="description" content="$(Esc $metaDesc)">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
  <link rel="canonical" href="$url">
  <meta name="theme-color" content="#F47B20">
  <meta property="og:site_name" content="EBTOOLS">
  <meta property="og:type" content="product">
  <meta property="og:locale" content="es_AR">
  <meta property="og:title" content="$(Esc $name) &mdash; EBTOOLS">
  <meta property="og:description" content="$(Esc $metaDesc)">
  <meta property="og:url" content="$url">
  <meta property="og:image" content="$(Esc $img)">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="$(Esc $name) &mdash; EBTOOLS">
  <meta name="twitter:description" content="$(Esc $metaDesc)">
  <meta name="twitter:image" content="$(Esc $img)">
  <link rel="icon" href="/assets/icon.png" type="image/png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root{--o:#F47B20;--b:#0f0f0f;--g5:#777;--g2:#e8e8e8;--g1:#f5f5f5}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',system-ui,sans-serif;color:var(--b);background:#fff;line-height:1.65;-webkit-font-smoothing:antialiased}
    .doc-nav{display:flex;align-items:center;justify-content:space-between;padding:15px 6vw;border-bottom:1px solid var(--g2);position:sticky;top:0;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);z-index:10}
    .doc-nav img{height:32px}
    .doc-nav a.back{color:var(--b);text-decoration:none;font-weight:700;font-size:.82rem;border:1px solid var(--g2);padding:8px 15px;border-radius:8px}
    .doc-nav a.back:hover{border-color:var(--b)}
    .crumb{max-width:1080px;margin:0 auto;padding:18px 6vw 0;font-size:.8rem;color:var(--g5)}
    .crumb a{color:var(--g5);text-decoration:none}
    .crumb a:hover{color:var(--o)}
    .wrap{max-width:1080px;margin:0 auto;padding:24px 6vw 70px;display:grid;grid-template-columns:1fr 1fr;gap:44px}
    .ph{background:var(--g1);border-radius:18px;overflow:hidden;display:flex;align-items:center;justify-content:center;aspect-ratio:1}
    .ph img{width:100%;height:100%;object-fit:contain}
    .cat{font-size:.75rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--o);margin-bottom:10px}
    h1{font-size:clamp(1.6rem,3.4vw,2.3rem);font-weight:900;letter-spacing:-.03em;margin-bottom:16px;line-height:1.1}
    .desc{color:#333;font-size:1.02rem;margin-bottom:26px}
    .cta{display:flex;flex-wrap:wrap;gap:12px}
    .btn{display:inline-flex;align-items:center;gap:9px;text-decoration:none;font-weight:700;padding:14px 24px;border-radius:11px;font-size:.95rem;transition:.15s}
    .btn-wa{background:#25D366;color:#fff}
    .btn-wa:hover{filter:brightness(.95)}
    .btn-ghost{background:#fff;color:var(--b);border:1px solid var(--g2)}
    .btn-ghost:hover{border-color:var(--b)}
    footer{border-top:1px solid var(--g2);padding:26px 6vw;color:var(--g5);font-size:.82rem;display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between}
    footer a{color:var(--g5)}
    @media(max-width:760px){.wrap{grid-template-columns:1fr;gap:24px}}
  </style>
  <script type="application/ld+json">
  {"@context":"https://schema.org/","@graph":[
    {"@type":"Product","@id":"$url#product","name":"$nameJson","image":$imgJson,"description":"$descrJson","sku":"EBT-$id","category":"$(JsonStr $catLabelStr)","brand":{"@type":"Brand","name":"EBTOOLS"},"manufacturer":{"@type":"Organization","name":"EBTOOLS"},"url":"$url","itemCondition":"https://schema.org/NewCondition"},
    {"@type":"BreadcrumbList","itemListElement":[
      {"@type":"ListItem","position":1,"name":"Inicio","item":"$base/"},
      {"@type":"ListItem","position":2,"name":"Productos","item":"$base/#productos"},
      {"@type":"ListItem","position":3,"name":"$breadcrumbName","item":"$url"},
      {"@type":"ListItem","position":4,"name":"$nameJson","item":"$url"}
    ]}
  ]}
  </script>
</head>
<body>
  <nav class="doc-nav">
    <a href="/"><img src="/assets/logo.png" alt="EBTOOLS Herramientas"></a>
    <a class="back" href="/#productos">&larr; Ver cat&aacute;logo</a>
  </nav>
  <div class="crumb"><a href="/">Inicio</a> &rsaquo; <a href="/#productos">Productos</a> &rsaquo; $(Esc $primaryCat)</div>
  <main class="wrap">
    <div class="ph"><img src="$(Esc $img)" alt="$(Esc $name)" loading="eager"></div>
    <div class="info">
      <div class="cat">$catLabelStr</div>
      <h1>$(Esc $name)</h1>
      <p class="desc">$descHtml</p>
      <div class="cta">
        <a class="btn btn-wa" href="$waLink" target="_blank" rel="noopener">Consultar por WhatsApp</a>
        <a class="btn btn-ghost" href="/producto?id=$id">Ver galer&iacute;a y relacionados</a>
      </div>
    </div>
  </main>
  <footer>
    <span>&copy; 2026 EBTOOLS Herramientas &mdash; tambi&eacute;n El Bahiense en MercadoLibre.</span>
    <span><a href="/preguntas-frecuentes">Preguntas frecuentes</a> &middot; <a href="/privacidad">Privacidad</a> &middot; <a href="/terminos">T&eacute;rminos</a></span>
  </footer>
</body>
</html>
"@
  [System.IO.File]::WriteAllText((Join-Path $outDir "$id.html"), $html, $utf8)
  $count++
}

# --- Sitemap ---
$today = (Get-Date -Format 'yyyy-MM-dd')
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('<?xml version="1.0" encoding="UTF-8"?>')
[void]$sb.AppendLine('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
[void]$sb.AppendLine("  <url><loc>$base/</loc><lastmod>$today</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>")
foreach($pg in 'preguntas-frecuentes','privacidad','terminos'){
  [void]$sb.AppendLine("  <url><loc>$base/$pg</loc><lastmod>$today</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>")
}
foreach($p in ($products | Sort-Object id)){
  [void]$sb.AppendLine("  <url><loc>$base/producto/$($p.id)</loc><lastmod>$today</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>")
}
[void]$sb.AppendLine('</urlset>')
[System.IO.File]::WriteAllText((Join-Path $root 'sitemap.xml'), $sb.ToString(), $utf8)

Write-Host "OK: $count paginas de producto generadas + sitemap con $($products.Count + 4) URLs."
