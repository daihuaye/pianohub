// eslint-disable-next-line no-unused-vars
/**
 * Thin wrapper around the WASM Pianolizer class exposed by Emscripten.
 */
class Pianolizer {
  /* global Module */
  /**
   * Instantiate the analyzer with piano-specific tuning defaults.
   *
   * @param {number} sampleRate Incoming audio sample rate in Hz.
   * @param {number} [keysNum=61] Number of piano keys to analyze.
   * @param {number} [referenceKey=33] Index of the reference key (A4).
   * @param {number} [pitchFork=440] Frequency of A4 in Hz.
   * @param {number} [tolerance=1] Frequency tolerance factor.
   */
  constructor (
    sampleRate,
    keysNum = 61,
    referenceKey = 33,
    pitchFork = 440.0,
    tolerance = 1.0
  ) {
    this.pianolizer = new Module.Pianolizer(
      sampleRate,
      keysNum,
      referenceKey,
      pitchFork,
      tolerance
    )
  }

  /**
   * Make sure the shared WASM memory buffer matches the requested sample count.
   *
   * @param {number} requestedSamplesBufferSize Desired number of samples.
   */
  adjustSamplesBuffer (requestedSamplesBufferSize) {
    if (this.samplesBufferSize === requestedSamplesBufferSize) {
      return
    }

    if (this.samplesBuffer !== undefined) {
      Module._free(this.samplesBuffer)
    }

    this.samplesBufferSize = requestedSamplesBufferSize
    this.samplesBuffer = Module._malloc(this.samplesBufferSize * Float32Array.BYTES_PER_ELEMENT)
    const startOffset = this.samplesBuffer / Float32Array.BYTES_PER_ELEMENT
    const endOffset = startOffset + this.samplesBufferSize

    // Emscripten no longer guarantees HEAP views are mirrored on Module; fall back to direct symbols.
    let heapF32 = Module.HEAPF32
    if (heapF32 === undefined && typeof HEAPF32 !== 'undefined') {
      heapF32 = HEAPF32
      Module.HEAPF32 = heapF32
    }
    if (heapF32 === undefined) {
      const runtimeMemory = Module.wasmMemory ??
        (typeof wasmMemory !== 'undefined' ? wasmMemory : undefined) ??
        (typeof Module.asm !== 'undefined' ? Module.asm.memory : undefined)

      if (runtimeMemory !== undefined) {
        Module.wasmMemory = runtimeMemory
        heapF32 = new Float32Array(runtimeMemory.buffer)
        Module.HEAPF32 = heapF32
      }
    }
    if (heapF32 === undefined) {
      throw new Error('Emscripten HEAPF32 view is not initialized yet')
    }

    this.samplesView = heapF32.subarray(startOffset, endOffset)
  }

  /**
   * Analyze a block of samples and return per-key intensity levels.
   *
   * @param {Float32Array} samples Audio data to analyze.
   * @param {number} [averageWindowInSeconds=0] Moving average window length in seconds.
   * @return {Float32Array} Analyzer output copied from WASM memory.
   */
  process (samples, averageWindowInSeconds = 0) {
    this.adjustSamplesBuffer(samples.length)

    for (let i = 0; i < this.samplesBufferSize; i++) {
      this.samplesView[i] = samples[i]
      samples[i] = 0
    }

    const levels = this.pianolizer.process(
      this.samplesBuffer,
      this.samplesBufferSize,
      averageWindowInSeconds
    )

    return new Float32Array(levels)
  }
}
