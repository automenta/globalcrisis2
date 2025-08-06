export class AudioManager {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.soundBuffers = new Map();
        this.musicSource = null;
    }

    async loadSound(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.soundBuffers.set(name, audioBuffer);
            console.log(`Sound loaded: ${name}`);
        } catch (error) {
            console.error(`Error loading sound ${name}:`, error);
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
}
