<div class="crt-overlay pointer-events-none fixed inset-0 z-50">
  <div class="scanlines"></div>
  <div class="vignette"></div>
</div>

<style>
  .scanlines {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 0, 0, 0.03) 2px,
      rgba(0, 0, 0, 0.03) 4px
    );
  }
  .vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse at center,
      transparent 60%,
      rgba(0, 0, 0, 0.4) 100%
    );
  }
</style>
