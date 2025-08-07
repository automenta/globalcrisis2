describe('Simulation Web Worker Delta Updates', () => {
    let worker;

    beforeEach((done) => {
        worker = new Worker('../src/simulation_worker.js', { type: 'module' });
        worker.onmessage = function(e) {
            if (e.data.type === 'init_complete') {
                worker.postMessage({ type: 'start' });
                done();
            }
        };
        worker.postMessage({ type: 'init' });
    });

    afterEach(() => {
        worker.terminate();
    });

    it('should receive a delta update with a new threat', (done) => {
        worker.onmessage = function(e) {
            const { type, payload } = e.data;
            if (type === 'update') {
                if (payload.newThreats.length > 0) {
                    expect(payload.newThreats).to.have.lengthOf(1);
                    expect(payload.newThreats[0].domain).to.equal('CYBER');
                    done();
                }
            }
        };

        worker.postMessage({
            type: 'DEBUG_CREATE_THREAT',
            payload: { domain: 'CYBER', type: 'REAL', severity: 0.5, lat: 0, lon: 0 }
        });
    });
});
