const SOUND_FILES = {
  click: '/assets/sfx/click.wav',
  pop: '/assets/sfx/pop.wav',
  flip: '/assets/sfx/flip.wav',
  success: '/assets/sfx/success.wav',
  fail: '/assets/sfx/fail.wav',
  round: '/assets/sfx/round.wav',
  win: '/assets/sfx/win.wav',
  tick: '/assets/sfx/tick.wav'
}

const DEFAULT_VOLUME = 0.45
const SOUND_ENABLED_KEY = 'soundEnabled'
const contexts = {}

function isSoundEnabled() {
  if (typeof wx === 'undefined' || typeof wx.getStorageSync !== 'function') return true
  const storedValue = wx.getStorageSync(SOUND_ENABLED_KEY)
  return storedValue === '' || storedValue === undefined ? true : storedValue !== false
}

function setSoundEnabled(enabled) {
  if (typeof wx !== 'undefined' && typeof wx.setStorageSync === 'function') {
    wx.setStorageSync(SOUND_ENABLED_KEY, !!enabled)
  }
  if (!enabled) {
    Object.keys(contexts).forEach((name) => {
      try {
        contexts[name].stop()
      } catch (error) {
        // Stopping audio may fail if the context is already released.
      }
    })
  }
}

function canPlayAudio() {
  return typeof wx !== 'undefined' && typeof wx.createInnerAudioContext === 'function'
}

function getContext(name) {
  if (!canPlayAudio() || !SOUND_FILES[name]) return null
  if (!contexts[name]) {
    const context = wx.createInnerAudioContext()
    context.src = SOUND_FILES[name]
    context.volume = DEFAULT_VOLUME
    context.obeyMuteSwitch = false
    contexts[name] = context
  }
  return contexts[name]
}

function playSound(name) {
  if (!isSoundEnabled()) return
  const context = getContext(name)
  if (!context) return

  try {
    context.stop()
    context.seek(0)
    context.play()
  } catch (error) {
    // Audio can fail quietly on unsupported devices or before the context is ready.
  }
}

function destroySounds() {
  Object.keys(contexts).forEach((name) => {
    try {
      contexts[name].destroy()
    } catch (error) {
      // Ignore cleanup failures; the mini program runtime will release the page soon.
    }
    delete contexts[name]
  })
}

module.exports = {
  isSoundEnabled,
  setSoundEnabled,
  playSound,
  destroySounds
}
