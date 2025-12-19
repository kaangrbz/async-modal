# Sound Files

This directory is for notification sound files.

## Default Sound File

The default sound file path is `./sound/notification_tone.wav`.

You can:
1. Place your own `notification_tone.wav` file in this directory
2. Use a custom path when calling `show()` with the `soundPath` option
3. Set a default path using `modal.setSoundPath(path)`

## Supported Formats

- WAV (recommended)
- MP3
- OGG
- Any format supported by the HTML5 Audio API

## Example

```javascript
// Use default path
await modal.show({
  playSound: true
});

// Use custom path
await modal.show({
  playSound: true,
  soundPath: './custom-sounds/alert.mp3'
});

// Set default path
modal.setSoundPath('./custom-sounds/notification.wav');
await modal.show({
  playSound: true
});
```

