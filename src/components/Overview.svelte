<script>
  import SlideView from './SlideView.svelte'

  let { slides = [], cursor = 0, currentIndex = 0, title = '', onselect, onclose } = $props()
</script>

<div
  class="overlay"
  role="dialog"
  aria-modal="true"
  aria-label="Overview"
  onclick={(event) => {
    if (event.target === event.currentTarget) onclose()
  }}
>
  <div class="panel">
    <div class="panel-head">
      <strong>overview</strong>
      <span>{slides.length} slides</span>
      <span style="margin-left:auto">h j k l · enter · esc</span>
    </div>
    <div class="panel-body">
      <div class="overview-grid">
        {#each slides as slide, i (slide.index)}
          <button
            class="thumb"
            class:is-active={i === cursor}
            type="button"
            aria-label="Go to slide {i + 1}: {slide.title}"
            onclick={() => onselect(i)}
          >
            <span class="thumb-index">{String(i + 1).padStart(2, '0')}</span>
            <div class="thumb-inner">
              <SlideView blocks={slide.blocks} activeIndex={-1} hydrate={false} />
            </div>
            <span class="thumb-caption">{slide.title}</span>
          </button>
        {/each}
      </div>
    </div>
  </div>
</div>
