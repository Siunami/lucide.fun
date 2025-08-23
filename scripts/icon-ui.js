;(function () {
    const css = `
    .icon-tooltip{
      position: fixed; z-index: 40; pointer-events: none;
      background: var(--accent); color: #fff; font-size: 12px;
      padding: 6px 10px; border-radius: 8px;
      transform: translate(-50%, 0); white-space: nowrap;
      box-shadow: 0 6px 16px #0006;
    }
    /* Tile hover + pointer */
    .tile{
      cursor: pointer;
      transition: background-color .12s ease, border-color .12s ease;
    }
    .tile:hover{
      background: #24282d; /* fallback lighter than var(--panel) */
      background: color-mix(in srgb, var(--panel), #fff 12%); /* modern browsers */
      border-color: #3a3f46;
    }
    .icon-pop{
      position: fixed; z-index: 41; min-width: 200px;
      background: var(--panel); color: var(--text);
      border: 1px solid var(--border); border-radius: 10px;
      box-shadow: 0 12px 32px #0009; padding: 6px;
    }
    .icon-pop .row{
      display: grid; gap: 4px; padding: 6px 4px;
    }
    .icon-pop button{
      all: unset; display: block; width: 100%;
      padding: 8px 10px; border-radius: 8px; cursor: pointer;
    }
    .icon-pop button:hover{ background: #121418; }
    .icon-pop .sep{ height: 1px; background: var(--border); margin: 4px 0; }
    .icon-toast{
      position: fixed; right: 14px; bottom: 14px; z-index: 45;
      background: #1c1e22; color: var(--text); border: 1px solid var(--border);
      padding: 10px 12px; border-radius: 10px; box-shadow: 0 8px 24px #0008;
      opacity: 0; transform: translateY(6px); transition: .16s ease;
    }
    .icon-toast.show{ opacity: 1; transform: translateY(0); }
    `
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
  
    const tooltip = document.createElement('div')
    tooltip.className = 'icon-tooltip'
    tooltip.hidden = true
    document.body.appendChild(tooltip)
  
    const pop = document.createElement('div')
    pop.className = 'icon-pop'
    pop.hidden = true
    document.body.appendChild(pop)
  
    const toast = document.createElement('div')
    toast.className = 'icon-toast'
    document.body.appendChild(toast)
    let toastTimer
    let currentTile = null
  
    function showToast(text) {
      toast.textContent = text
      toast.classList.add('show')
      clearTimeout(toastTimer)
      toastTimer = setTimeout(() => toast.classList.remove('show'), 1400)
    }
  
    function getIconNameFromTile(tile) {
      const i = tile.querySelector('[data-lucide]')
      if (i) return i.getAttribute('data-lucide') || ''
      const svg = tile.querySelector('svg.lucide')
      if (!svg) return ''
      const cls = Array.from(svg.classList).find(c => c.startsWith('lucide-') && c !== 'lucide')
      return cls ? cls.replace('lucide-', '') : ''
    }
  
    function toPascalCase(kebab) {
      return kebab.replace(/(^[a-z])|(-[a-z])/g, s => s.replace('-', '').toUpperCase())
    }
  
    function getTileSvg(tile) {
      return tile.querySelector('svg') || null
    }
  
    function copyText(txt) {
      return navigator.clipboard.writeText(txt)
    }
  
    function copySvg(svg) {
      return copyText(svg.outerHTML)
    }
  
    function copyJsxName(name) {
      return copyText(`<${toPascalCase(name)} />`)
    }
  
    function copyDataUrl(svg) {
      const url = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg.outerHTML)
      return copyText(url)
    }
  
    function download(filename, blob) {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename
      document.body.appendChild(a)
      a.click()
      URL.revokeObjectURL(a.href)
      a.remove()
    }
  
    function downloadSvg(name, svg) {
      const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' })
      download(`${name}.svg`, blob)
    }
  
    function downloadPng(name, svg, size = 512) {
      const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg.outerHTML)))
      const img = new Image()
      // respect color scheme by forcing stroke to currentColor on white bg
      img.onload = () => {
        const c = document.createElement('canvas')
        c.width = size; c.height = size
        const ctx = c.getContext('2d')
        ctx.clearRect(0, 0, size, size)
        // Draw on neutral background so PNG is visible in finders
        ctx.fillStyle = '#ffffff00'
        ctx.fillRect(0, 0, size, size)
        ctx.drawImage(img, 0, 0, size, size)
        c.toBlob(b => b && download(`${name}.png`, b), 'image/png')
      }
      img.src = url
    }
  
    function placeEl(el, rect, yOffset = 8) {
        const x = rect.left + rect.width / 2
        const y = rect.bottom + yOffset
        el.style.left = x + 'px'
        el.style.top = y + 'px'
    }
  
    function openMenu(tile) {
      const name = getIconNameFromTile(tile)
      const svg = getTileSvg(tile)
      if (!name || !svg) return
  
      pop.innerHTML = ''
      const row = document.createElement('div')
      row.className = 'row'
      const mkBtn = (label, fn) => {
        const b = document.createElement('button')
        b.textContent = label
        b.addEventListener('click', async () => {
          try { await fn() } finally { closeMenu() }
        })
        return b
      }
  
      row.appendChild(mkBtn('Copy Component Name', () => copyText(toPascalCase(name)).then(() => showToast('Component name copied'))))
      row.appendChild(mkBtn('Copy JSX', () => copyJsxName(name).then(() => showToast('JSX copied'))))
      row.appendChild(document.createElement('div')).className = 'sep'
      row.appendChild(mkBtn('Copy SVG', () => copySvg(svg).then(() => showToast('SVG copied'))))
      row.appendChild(mkBtn('Copy Data URL', () => copyDataUrl(svg).then(() => showToast('Data URL copied'))))
      row.appendChild(mkBtn('Download SVG', () => { downloadSvg(name, svg); showToast('SVG downloading') }))
      row.appendChild(mkBtn('Download PNG', () => { downloadPng(name, svg, 512); showToast('PNG generating') }))
  
      pop.appendChild(row)
  
      const rect = tile.getBoundingClientRect()
      pop.hidden = false
      // place near the tile (viewport-relative)
      pop.style.top = Math.max(10, rect.top - 4) + 'px'
      pop.style.left = Math.max(10, rect.left + rect.width - 4 - pop.offsetWidth) + 'px'

      // recalc after paint for accurate width
      requestAnimationFrame(() => {
        const r = tile.getBoundingClientRect()
        pop.style.top = Math.max(10, r.top - 4) + 'px'
        pop.style.left = Math.max(10, r.left + r.width - 4 - pop.offsetWidth) + 'px'
      })
    }
  
    function closeMenu() { pop.hidden = true }
  
    function onPointerEnter(e) {
        const tile = e.target.closest('.tile')
        if (!tile) return
        const name = getIconNameFromTile(tile)
        if (!name) return
        currentTile = tile
        tooltip.textContent = name
        const rect = tile.getBoundingClientRect()
        placeEl(tooltip, rect, 8)
        tooltip.hidden = false
    }
  
    function onPointerMove(e) {
        if (tooltip.hidden) return
        const tile = e.target.closest('.tile')
        if (!tile) { tooltip.hidden = true; currentTile = null; return }
        currentTile = tile
        placeEl(tooltip, tile.getBoundingClientRect(), 8)
    }
  
    function onPointerLeave(e) {
        const tile = e.target.closest('.tile')
        if (!tile) return
        tooltip.hidden = true
        if (currentTile === tile) currentTile = null
    }
  
    function onClick(e) {
      const tile = e.target.closest('.tile')
      if (!tile) return
      e.preventDefault()
      e.stopPropagation()
      if (pop.hidden) openMenu(tile)
      else closeMenu()
    }
  
    function globalClose(e) {
      if (!pop.hidden && !e.target.closest('.icon-pop')) closeMenu()
    }
  
    function wire() {
        document.addEventListener('pointerenter', onPointerEnter, true)
        document.addEventListener('pointermove', onPointerMove, true)
        document.addEventListener('pointerleave', onPointerLeave, true)
        document.addEventListener('click', onClick, true)
        document.addEventListener('scroll', () => {
          if (!pop.hidden) closeMenu()
          if (!tooltip.hidden && currentTile) {
            placeEl(tooltip, currentTile.getBoundingClientRect(), 8)
          }
        }, { passive: true, capture: true })
        window.addEventListener('resize', () => { tooltip.hidden = true; closeMenu() })
        document.addEventListener('click', globalClose)
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { tooltip.hidden = true; closeMenu() } })
      }
  
    function waitForIconsThen(fn) {
      // If icons already rendered, proceed; else wait a tick
      const hasIcons = !!document.querySelector('svg.lucide, [data-lucide]')
      if (hasIcons) fn()
      else setTimeout(() => fn(), 0)
    }
  
    window.IconUI = {
      init() {
        waitForIconsThen(() => wire())
      }
    }
  })()