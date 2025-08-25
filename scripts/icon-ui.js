;(function () {
    const css = `
    .icon-tooltip{
      position: fixed; z-index: 40; pointer-events: none;
      background: var(--accent); color: #fff; font-size: 12px;
      padding: 6px 10px; border-radius: 8px;
      transform: translate(-50%, 0); white-space: nowrap;
      box-shadow: 0 6px 16px #0006;
    }
    .tile{
      cursor: pointer;
      transition: background-color .12s ease, border-color .12s ease;
    }
    .tile:hover{
      background: color-mix(in srgb, var(--panel), #fff 12%);
      border-color: #3a3f46;
    }
  
    .icon-pop{
      position: fixed; z-index: 41;
      background: var(--panel); color: var(--text);
      border: 1px solid var(--border); border-radius: 12px;
      box-shadow: 0 12px 32px #0009;
      padding: 14px;
    }
    .icon-pop.overlay{
      display: flex;
      flex-direction: row;
      align-items: stretch;
      gap: 12px;
      height: 320px; /* fixed bottom bar height */
    }

    .icon-pop.overlay[hidden] {
        display: none !important;
    }

    .icon-pop .close-btn{
      position: absolute; top: 10px; right: 10px; z-index: 2;
      padding: 8px;
      cursor: pointer;
      border-radius: 12px; background: #0e0f11; border: 1px solid var(--border);
    }

    /* Left preview fills available height */
    .icon-container{
      display: grid; place-items: center;
      width: 296px; height: 296px;
      border-radius: 12px; background: #0e0f11; border: 1px solid var(--border);
      padding: 12px;
    }
    .icon-container svg{
      width: auto; height: auto; color: #e9ecef;
      max-width: 80%; max-height: 80%;
    }
  
    /* Right column */
    .icon-info .icon-name{
      margin: 0; font-size: 1.35rem; font-weight: 700; letter-spacing: .01em;
      display: inline-flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;
    }
    .icon-info .icon-name .copy{
      width: 18px; height: 18px; opacity: 0; color: var(--muted);
      transition: opacity .12s ease;
    }
    .icon-info .icon-name:hover .copy{ opacity: 1; }
    .icon-info .info-head{
      display: flex; flex-direction: column; gap: 12px; flex-wrap: wrap;
    }
  
    .buttons{ display: flex; flex-wrap: wrap; gap: 8px; margin-top: 0; }
    .VPButton{
      all: unset; display: inline-flex; align-items: center; justify-content: center;
      padding: 10px 14px; border-radius: 999px; cursor: pointer;
      background: #121418; border: 1px solid var(--border); font-weight: 600;
    }
    .VPButton.brand{ background: #ef4444; color: #fff; border-color: transparent; padding: 12px 18px; }
    .VPButton.brand:hover{ filter: brightness(.95); }
    .VPButton.alt:hover{ background: #0f1115; }
  
    /* Clean pill split-button */
    .button-wrapper{
      display: inline-flex; align-items: stretch;
      border: 1px solid var(--border); border-radius: 999px; overflow: hidden;
      background: #121418;
    }
    .main-button{ min-width: 128px; border: 0; border-radius: 0; }
    .split-toggle{
      all: unset; display: inline-flex; width: 40px; align-items: center; justify-content: center;
      cursor: pointer; border: 0; background: transparent;
    }
    .split-toggle:hover{ background: #0f1115; }
    .menu{ position: relative; }
  
    .dd{
      position: absolute; z-index: 50; top: calc(100% + 6px); right: 0;
      background: var(--panel); border: 1px solid var(--border);
      border-radius: 10px; box-shadow: 0 12px 32px #0009; padding: 6px; min-width: 180px;
    }
    .dd button{
      all: unset; display: block; width: 100%; padding: 8px 10px; border-radius: 8px; cursor: pointer;
    }
    .dd button:hover{ background: #121418; }
  
    @media (max-width: 860px){
      .icon-pop.overlay{ grid-template-columns: 1fr; height: auto; }
      .icon-container{ height: auto; }
      .icon-container svg{ width: auto; height: auto; max-width: none; max-height: none; }
    }
  
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
    pop.className = 'icon-pop overlay'
    pop.hidden = true
    document.body.appendChild(pop)
  
    const toast = document.createElement('div')
    toast.className = 'icon-toast'
    document.body.appendChild(toast)
    let toastTimer
    let currentTile = null
    let iconToCats = null
  
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
  
    function copyText(txt) { return navigator.clipboard.writeText(txt) }
    function copySvg(svg) { return copyText(svg.outerHTML) }
    function copyJsxName(name) { return copyText(`<${toPascalCase(name)} />`) }
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
      img.onload = () => {
        const c = document.createElement('canvas')
        c.width = size; c.height = size
        const ctx = c.getContext('2d')
        ctx.clearRect(0, 0, size, size)
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
  
    // Safely find closest element from an event (handles non-Element targets)
    function closestFromEvent(e, selector) {
      let t = e.target
      if (!(t instanceof Element)) {
        const p = e.composedPath && e.composedPath()
        t = (p && p.find(n => n instanceof Element)) || null
      }
      return t && t.closest ? t.closest(selector) : null
    }
  
    // Bottom bar aligned inside <main>
    // Fixed bar aligned to the <main> horizontal area
    function positionPanel() {
        const main = document.querySelector('main')
        const rect = (main || document.body).getBoundingClientRect()
        const inset = 20
        const left = Math.max(10, rect.left + inset)
        const right = Math.min(window.innerWidth - 10, rect.right - inset)
        const width = Math.max(260, right - left)
        pop.style.left = left + 'px'
        pop.style.right = 'auto'         // override any CSS right/inset
        pop.style.width = width + 'px'
        pop.style.top = ''
        pop.style.bottom = '12px'
    }

    function makeDropdown(items) {
      const dd = document.createElement('div')
      dd.className = 'dd'
      dd.hidden = true
      for (const { label, onClick } of items) {
        const b = document.createElement('button')
        b.textContent = label
        b.addEventListener('click', (e) => { e.stopPropagation(); dd.hidden = true; onClick() })
        dd.appendChild(b)
      }
      return dd
    }
  
    function openMenu(tile) {
      const name = getIconNameFromTile(tile)
      const svg = getTileSvg(tile)
      if (!name || !svg) return
  
      currentTile = tile
      pop.innerHTML = ''
  
      // Top nav: close button
      const nav = document.createElement('nav')
      nav.className = 'op-nav'

      // Close button (absolute, top-right)
      const close = document.createElement('button')
      close.className = 'icon-button close-btn'
      close.setAttribute('aria-label', 'Close')
      close.title = 'Close'
      close.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>'
      close.addEventListener('click', (e) => { e.preventDefault(); e.stopImmediatePropagation(); closeMenu() })

      // Preview (left column)
      const preview = document.createElement('div')
      preview.className = 'icon-container'
      const svgClone = svg.cloneNode(true)
      // let CSS size the clone; just ensure it has no hard width/height attrs
      svgClone.removeAttribute('width'); svgClone.removeAttribute('height')
      preview.appendChild(svgClone)
      pop.appendChild(preview)

      // Right info column
      const info = document.createElement('div')
      info.className = 'icon-info'

      // Title
      const h1 = document.createElement('h1')
      h1.className = 'icon-name'
      h1.textContent = name
      const copyEl = document.createElement('span')
      copyEl.className = 'copy'
      copyEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>'
      h1.appendChild(copyEl)
      h1.title = 'Copy icon name'
      h1.addEventListener('click', (e) => { e.stopPropagation(); copyText(name).then(() => showToast('Name copied')) })

      // Actions inline with title
      const actions = document.createElement('div')
      actions.className = 'group buttons'

      const see = document.createElement('a')
      see.className = 'VPButton medium brand'
      see.href = `https://lucide.dev/icons/${encodeURIComponent(name)}`
      see.target = '_blank'; see.rel = 'noopener'
      see.textContent = 'See in action'
      actions.appendChild(see)

      const svgMenu = document.createElement('div'); svgMenu.className = 'menu'
      const svgWrap = document.createElement('div'); svgWrap.className = 'button-wrapper'
      const svgBtn = document.createElement('button'); svgBtn.className = 'VPButton medium alt main-button'; svgBtn.textContent = 'Copy SVG'
      svgBtn.addEventListener('click', (e) => { e.stopPropagation(); copySvg(svg).then(() => showToast('SVG copied')) })
      const svgArrow = document.createElement('button'); svgArrow.className = 'split-toggle'
      svgArrow.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>'
      const svgDd = makeDropdown([
        { label: 'Copy Data URL', onClick: () => copyDataUrl(svg).then(() => showToast('Data URL copied')) },
        { label: 'Download SVG', onClick: () => { downloadSvg(name, svg); showToast('SVG downloading') } },
        { label: 'Download PNG', onClick: () => { downloadPng(name, svg, 512); showToast('PNG generating') } },
      ])
      svgArrow.addEventListener('click', (e) => {
        e.stopPropagation()
        const showing = !svgDd.hidden
        document.querySelectorAll('.dd').forEach(x => x.hidden = true)
        svgDd.hidden = showing ? true : false
      })
      svgWrap.appendChild(svgBtn); svgWrap.appendChild(svgArrow); svgMenu.appendChild(svgWrap); svgMenu.appendChild(svgDd)
      actions.appendChild(svgMenu)

      const jsxBtn = document.createElement('button'); jsxBtn.className = 'VPButton medium alt'; jsxBtn.textContent = 'Copy JSX'
      jsxBtn.addEventListener('click', (e) => { e.stopPropagation(); copyJsxName(name).then(() => showToast('JSX copied')) })
      actions.appendChild(jsxBtn)

      const head = document.createElement('div')
      head.className = 'info-head'
      head.appendChild(h1)
      head.appendChild(actions)

      info.appendChild(head)
      pop.appendChild(info)

      // Append close last so it sits on top
      pop.appendChild(close)

      pop.hidden = false
      positionPanel()
      requestAnimationFrame(positionPanel)
    }
  
    function closeMenu() { pop.hidden = true }

    function onPointerMove(e) {
        const tile = closestFromEvent(e, '.tile')
        if (tile) {
          const name = getIconNameFromTile(tile)
          if (!name) { tooltip.hidden = true; currentTile = null; return }
          currentTile = tile
          tooltip.textContent = name
          placeEl(tooltip, tile.getBoundingClientRect(), 8)
          tooltip.hidden = false
        } else {
          tooltip.hidden = true
          currentTile = null
        }
    }
  
    function onClick(e) {
      const tile = closestFromEvent(e, '.tile')
      if (!tile) return
      e.preventDefault()
      e.stopPropagation()
      if (pop.hidden) openMenu(tile)
      else closeMenu()
    }
  
    function globalClose(e) {
      const insidePanel = !!closestFromEvent(e, '.icon-pop')
      if (!pop.hidden && !insidePanel) closeMenu()
    }
  
    function wire() {
        // Drive hover from pointermove so SVG and container are unified
        document.addEventListener('pointermove', onPointerMove, true)
        document.addEventListener('click', onClick, true)
        document.addEventListener('scroll', () => {
          if (!tooltip.hidden && currentTile) {
            placeEl(tooltip, currentTile.getBoundingClientRect(), 8)
          }
          if (!pop.hidden) positionPanel()
        }, { passive: true, capture: true })
        window.addEventListener('resize', () => {
          tooltip.hidden = true
          if (!pop.hidden) positionPanel()
        })
      document.addEventListener('click', (e) => {
        const inMenu = !!closestFromEvent(e, '.menu')
        if (!inMenu) document.querySelectorAll('.dd').forEach(x => x.hidden = true)
      })
      document.addEventListener('click', globalClose)
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { tooltip.hidden = true; closeMenu() } })
    }
  
    function waitForIconsThen(fn) {
      const hasIcons = !!document.querySelector('svg.lucide, [data-lucide]')
      if (hasIcons) fn()
      else setTimeout(() => fn(), 0)
    }
  
    window.IconUI = {
      init() { waitForIconsThen(() => wire()) }
    }
  })()