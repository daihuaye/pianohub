import { RingBuffer, DFTBin, FastMovingAverage, HeavyMovingAverage } from './pianolizer.js'

const sampleRate = 44100
const waveform = {
  SINE: 0,
  SAWTOOTH: 1,
  SQUARE: 2,
  NOISE: 3
}

// 441Hz wave period is 100 samples when the sample rate is 44100Hz
/**
 * Generate a normalized waveform sample for the requested oscillator type.
 *
 * @param {number} s Sample index.
 * @param {number} [type=waveform.SINE] Waveform enum identifying the shape.
 * @return {number} Sample value in the range [-1, 1].
 */
function oscillator (s, type = waveform.SINE) {
  switch (type) {
    case waveform.SINE:
      return Math.sin((2.0 * Math.PI) / 100.0 * s)
    case waveform.SAWTOOTH:
      return ((s % 100) / 50.0) - 1.0
    case waveform.SQUARE:
      return ((s % 100) < 50) ? 1.0 : -1.0
    case waveform.NOISE:
      return 2.0 * Math.random() - 1.0
  }
}

/**
 * Exercise the DFT bin against a synthetic waveform and assert its magnitude.
 *
 * @param {number} type Waveform enum value to synthesize.
 * @param {number} expected Expected normalized amplitude scaled by 1e6.
 */
function testDFT (type, expected) {
  const N = 1700
  const bin = new DFTBin(17, N)
  const rb = new RingBuffer(N)
  for (let i = 0; i < 2000; i++) {
    const currentSample = oscillator(i, type)
    rb.write(currentSample)
    const previousSample = rb.read(N)
    bin.update(previousSample, currentSample)
  }

  const nas = bin.normalizedAmplitudeSpectrum
  if (Math.floor(nas * 1_000_000) === expected) {
    console.log('ok')
  } else {
    console.log('not ok')
  }
}

/**
 * Compare fast and heavy moving-average implementations with example data.
 */
function testMovingAverage () {
  const fma = new FastMovingAverage(2, sampleRate)
  fma.averageWindowInSeconds = 0.01

  const hma = new HeavyMovingAverage(2, sampleRate, 500)
  hma.averageWindowInSeconds = 0.01

  for (let i = 0; i < 500; i++) {
    const sample = [oscillator(i, waveform.SINE), oscillator(i, waveform.SAWTOOTH)]
    fma.update(sample)
    hma.update(sample)
  }

  console.log(hma.read(0))
  console.log(hma.read(1))
}

testDFT(waveform.SINE, 999999)
testDFT(waveform.SAWTOOTH, 608005)
testDFT(waveform.SQUARE, 810836)

testMovingAverage()
