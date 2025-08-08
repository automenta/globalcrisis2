export class AudioManager {
    constructor() {
        this.audioContext = new (window.AudioContext ||
            window.webkitAudioContext)();
        this.soundBuffers = new Map();
        this.musicSource = null;
    }

    async loadSound(name) {
        try {
            const audioBuffer = this.generateSoundBuffer(name);
            this.soundBuffers.set(name, audioBuffer);
            console.log(`Sound generated: ${name}`);
        } catch (error) {
            console.error(`Error generating sound ${name}:`, error);
        }
    }

    playSound(name, loop = false) {
        if (!this.soundBuffers.has(name)) {
            console.warn(`Sound not found: ${name}`);
            return;
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = this.soundBuffers.get(name);
        source.connect(this.audioContext.destination);
        source.loop = loop;
        source.start(0);

        return source;
    }

    playMusic(name) {
        if (this.musicSource) {
            this.musicSource.stop();
        }
        this.musicSource = this.playSound(name, true);
    }

    generateSoundBuffer(name) {
        const duration = 1; // seconds
        const sampleRate = this.audioContext.sampleRate;
        const numberOfChannels = 1;
        const channelDataLength = duration * sampleRate;

        const buffer = this.audioContext.createBuffer(
            numberOfChannels,
            channelDataLength,
            sampleRate
        );
        const data = buffer.getChannelData(0);

        // Generate different sounds based on name
        if (name === 'click') {
            // Short beep
            const frequency = 1000; // 1000 Hz
            for (let i = 0; i < channelDataLength; i++) {
                const t = i / sampleRate;
                data[i] =
                    Math.sin(2 * Math.PI * frequency * t) *
                    (i < channelDataLength * 0.1 ? 1 : 0); // 10% duration
            }
        } else if (name === 'music') {
            // Looping ambient pad
            // Generate a mix of low frequency and some higher harmonics
            for (let i = 0; i < channelDataLength; i++) {
                const t = i / sampleRate;
                data[i] =
                    Math.sin(2 * Math.PI * 200 * t) +
                    0.5 * Math.sin(2 * Math.PI * 500 * t);
            }
        } else if (name === 'investigate') {
            // Rising pitch
            for (let i = 0; i < channelDataLength; i++) {
                const t = i / sampleRate;
                const freq = 200 + (800 * t) / duration; // from 200 to 1000 Hz
                data[i] = Math.sin(2 * Math.PI * freq * t);
            }
        } else if (name === 'mitigate') {
            // Falling pitch
            for (let i = 0; i < channelDataLength; i++) {
                const t = i / sampleRate;
                const freq = 1000 - (800 * t) / duration; // from 1000 to 200 Hz
                data[i] = Math.sin(2 * Math.PI * freq * t);
            }
        } else if (name === 'investigation_complete') {
            // Chime sound
            // Multiple quick tones
            for (let i = 0; i < channelDataLength; i++) {
                const t = i / sampleRate;
                const freq = 1000 + 500 * Math.sin(2 * Math.PI * 10 * t); // 1000 Hz with 500 Hz modulation
                data[i] = Math.sin(2 * Math.PI * freq * t);
            }
        } else {
            // Default to a simple sine wave
            const frequency = 440; // A4
            for (let i = 0; i < channelDataLength; i++) {
                const t = i / sampleRate;
                data[i] = Math.sin(2 * Math.PI * frequency * t);
            }
        }

        return buffer;
    }
}
