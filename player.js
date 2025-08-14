const adsRegexList = [
    /(?<!#EXT-X-DISCONTINUITY[\s\S]*)#EXT-X-DISCONTINUITY\n(?:.*?\n){18,24}#EXT-X-DISCONTINUITY\n(?![\s\S]*#EXT-X-DISCONTINUITY)/g,
    /#EXT-X-DISCONTINUITY\n(?:#EXT-X-KEY:METHOD=NONE\n(?:.*\n){18,24})?#EXT-X-DISCONTINUITY\n|convertv7\//g,
    /#EXT-X-DISCONTINUITY\n#EXTINF:3\.920000,\n.*\n#EXTINF:0\.760000,\n.*\n#EXTINF:2\.000000,\n.*\n#EXTINF:2\.500000,\n.*\n#EXTINF:2\.000000,\n.*\n#EXTINF:2\.420000,\n.*\n#EXTINF:2\.000000,\n.*\n#EXTINF:0\.780000,\n.*\n#EXTINF:1\.960000,\n.*\n#EXTINF:2\.000000,\n.*\n#EXTINF:1\.760000,\n.*\n#EXTINF:3\.200000,\n.*\n#EXTINF:2\.000000,\n.*\n#EXTINF:1\.360000,\n.*\n#EXTINF:2\.000000,\n.*\n#EXTINF:2\.000000,\n.*\n#EXTINF:0\.720000,\n.*/g
];

async function removeAds(url) {
    const req = await fetch(url);
    let playlist = (await req.text()).replace(/^[^#].*$/gm, l => { 
        try { return new URL(l, url).href; } catch { return l; } 
    });
    if (playlist.includes("#EXT-X-STREAM-INF")) 
        return removeAds(playlist.trim().split("\n").pop());
    if (adsRegexList.some(r => (r.lastIndex = 0, r.test(playlist)))) {
        playlist = adsRegexList.reduce((p, r) => p.replaceAll(r, ""), playlist);
    }
    return URL.createObjectURL(new Blob([playlist], { 
        type: req.headers.get("Content-Type") || "text/plain" 
    }));
}

// Responsive controls dựa theo chiều ngang thực tế của player
function setupResponsiveControls(art) {
    const container = art.template.$container;
    const observer = new ResizeObserver(entries => {
        for (let entry of entries) {
            const width = entry.contentRect.width;
            if (width < 300) {
                container.classList.add('mini-controls');
            } else {
                container.classList.remove('mini-controls');
            }
        }
    });
    observer.observe(container);
}

const m3u8Url = new URLSearchParams(location.search).get("url");
if (!m3u8Url) {
    document.body.innerHTML = "<h2 style='color:white;text-align:center;margin-top:20px;'>Thiếu tham số ?url=...</h2>";
    throw new Error("Thiếu link M3U8");
}

removeAds(m3u8Url).then(link => {
    if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(link);
        const art = new Artplayer({
            container: '#player',
            url: '',
            type: 'm3u8',
            autoplay: true,
            screenshot: true,
            fullscreen: true,
            setting: true,
            playbackRate: true,
            aspectRatio: true,
            airplay: true,
            theme: '#ff4747',
            customType: {
                m3u8: (video, url) => {
                    hls.loadSource(url);
                    hls.attachMedia(video);
                }
            },
            controls: [
                {
                    position: 'right',
                    html: `<div class="art-skip-icon" id="rewind-btn">
                            <svg viewBox="0 0 24 24">
                                <path d="M12 4V1L8 5l4 4V6
                                c3.31 0 6 2.69 6 6 0 1.74-.76 3.3-1.96 4.39l1.42 1.42
                                A7.963 7.963 0 0020 12c0-4.42-3.58-8-8-8z"/>
                            </svg>
                           </div>`,
                    click: () => {
                        art.currentTime -= 10;
                        const btn = document.querySelector('#rewind-btn svg');
                        btn.classList.remove('spin-left'); 
                        void btn.offsetWidth; // reset animation
                        btn.classList.add('spin-left');
                        // Lắng nghe sự kiện animationend để xóa class sau khi animation kết thúc
                        btn.addEventListener('animationend', () => {
                            btn.classList.remove('spin-left');
                        }, { once: true });
                    }
                },
                {
                    position: 'right',
                    html: `<div class="art-skip-icon" id="forward-btn">
                            <svg viewBox="0 0 24 24">
                                <path d="M12 4V1l4 4-4 4V6
                                c-3.31 0-6 2.69-6 6 0 1.74.76 3.3 1.96 4.39l-1.42 1.42
                                A7.963 7.963 0 014 12c0-4.42 3.58-8 8-8z"/>
                            </svg>
                           </div>`,
                    click: () => {
                        art.currentTime += 10;
                        const btn = document.querySelector('#forward-btn svg');
                        btn.classList.remove('spin-right');
                        void btn.offsetWidth; // reset animation
                        btn.classList.add('spin-right');
                        // Lắng nghe sự kiện animationend để xóa class sau khi animation kết thúc
                        btn.addEventListener('animationend', () => {
                            btn.classList.remove('spin-right');
                        }, { once: true });
                    }
                }
            ]
        });
        hls.attachMedia(art.video);

        // Bật chế độ responsive theo chiều ngang
        setupResponsiveControls(art);

        art.on('destroy', () => { try { hls.destroy(); } catch {} });
    } else {
        new Artplayer({
            container: '#player',
            url: link,
            type: 'm3u8',
            autoplay: true,
            screenshot: true,
            fullscreen: true,
            setting: true,
            playbackRate: true,
            aspectRatio: true,
            airplay: true,
            theme: '#ff4747'
        });
    }
}).catch(e => {
    document.body.innerHTML = `<h2 style='color:white;text-align:center;margin-top:20px;'>Lỗi: ${e.message}</h2>`;
});
