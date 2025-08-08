describe('E2E: Application Loading', () => {
    it('should load the application in an iframe without errors', (done) => {
        const iframe = document.createElement('iframe');
        iframe.src = '../index.html';
        iframe.style.width = '800px';
        iframe.style.height = '600px';
        document.body.appendChild(iframe);

        iframe.onload = () => {
            const canvas =
                iframe.contentWindow.document.querySelector('canvas');
            expect(canvas).to.not.be.null;
            done();
        };
    });
});
