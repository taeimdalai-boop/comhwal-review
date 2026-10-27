(function(){
  const config = window.REVIEW_AUDIO;
  if(!config) return;

  const audio = document.getElementById('reviewAudio');
  const toggle = document.getElementById('audioToggle');
  const seek = document.getElementById('audioSeek');
  const now = document.getElementById('audioNow');
  const duration = document.getElementById('audioDuration');
  const grid = document.getElementById('chapterGrid');
  const marks = document.getElementById('chapterMarks');
  const voiceButtons = Array.from(document.querySelectorAll('.voice-btn'));
  let voice = 'female';

  function formatTime(seconds){
    if(!Number.isFinite(seconds)) return '0:00';
    return Math.floor(seconds / 60) + ':' + Math.floor(seconds % 60).toString().padStart(2, '0');
  }
  function currentConfig(){ return config.voices[voice]; }
  function activeChapterIndex(){
    let active = 0;
    currentConfig().starts.forEach(function(start, index){ if(audio.currentTime >= start) active = index; });
    return active;
  }
  function syncChapter(){
    const active = activeChapterIndex();
    Array.from(grid.children).forEach(function(button, index){ button.classList.toggle('active', index === active); });
  }
  function renderChapters(){
    const data = currentConfig();
    seek.max = data.duration;
    duration.textContent = formatTime(data.duration);
    grid.innerHTML = '';
    marks.innerHTML = '';
    config.titles.forEach(function(title, index){
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chapter-btn' + (index === 0 ? ' active' : '');
      button.innerHTML = '<time>' + formatTime(data.starts[index]) + '</time>' + title;
      button.addEventListener('click', function(){
        const playChapter = function(){ audio.currentTime = data.starts[index]; audio.play(); };
        if(audio.readyState >= 1) playChapter();
        else audio.addEventListener('loadedmetadata', playChapter, {once:true});
      });
      grid.appendChild(button);
      const mark = document.createElement('i');
      mark.style.left = (data.starts[index] / data.duration * 100) + '%';
      marks.appendChild(mark);
    });
  }
  function chooseVoice(nextVoice){
    if(nextVoice === voice) return;
    audio.pause();
    voice = nextVoice;
    voiceButtons.forEach(function(button){ button.classList.toggle('on', button.dataset.voice === voice); });
    audio.src = currentConfig().src;
    audio.load();
    audio.playbackRate = Number(document.getElementById('audioRate').value);
    seek.value = 0;
    now.textContent = '0:00';
    toggle.textContent = '▶ 전체 듣기';
    renderChapters();
  }

  voiceButtons.forEach(function(button){ button.addEventListener('click', function(){ chooseVoice(button.dataset.voice); }); });
  toggle.addEventListener('click', function(){ if(audio.paused) audio.play(); else audio.pause(); });
  document.getElementById('audioBack').addEventListener('click', function(){ audio.currentTime = Math.max(0, audio.currentTime - 10); });
  document.getElementById('audioForward').addEventListener('click', function(){ audio.currentTime = Math.min(audio.duration || currentConfig().duration, audio.currentTime + 10); });
  document.getElementById('audioRate').addEventListener('change', function(event){ audio.playbackRate = Number(event.target.value); });
  seek.addEventListener('input', function(){ audio.currentTime = Number(seek.value); });
  audio.addEventListener('loadedmetadata', function(){ seek.max = audio.duration; duration.textContent = formatTime(audio.duration); });
  audio.addEventListener('play', function(){ toggle.textContent = '⏸ 일시정지'; });
  audio.addEventListener('pause', function(){ if(!audio.ended) toggle.textContent = audio.currentTime > 0 ? '▶ 이어 듣기' : '▶ 전체 듣기'; });
  audio.addEventListener('ended', function(){ toggle.textContent = '▶ 처음부터 듣기'; });
  audio.addEventListener('timeupdate', function(){ seek.value = audio.currentTime; now.textContent = formatTime(audio.currentTime); syncChapter(); });
  audio.addEventListener('error', function(){ toggle.textContent = '음원을 불러올 수 없습니다'; toggle.disabled = true; });
  renderChapters();
})();
