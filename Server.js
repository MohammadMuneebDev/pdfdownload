// api/download.js
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');
const { URL } = require('url');
const { v4: uuidv4 } = require('uuid');

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        const { url } = req.body;
        if (!url) {
            return res.status(400).send('URL is required');
        }

        const uniqueFolder = path.join('/tmp', uuidv4());

        async function downloadPdf(url, folder) {
            if (!fs.existsSync(folder)) {
                await fs.mkdir(folder, { recursive: true });
            }
            try {
                const response = await axios.get(url, { responseType: 'arraybuffer' });
                const pdfName = path.basename(new URL(url).pathname);
                const pdfPath = path.join(folder, pdfName);
                await fs.writeFile(pdfPath, response.data);
                return { success: true, message: `Downloaded: ${pdfName}`, path: pdfPath };
            } catch (error) {
                return { success: false, message: `Failed to download PDF from ${url}: ${error.message}` };
            }
        }

        async function downloadPdfsFromPage(pageUrl, folder) {
            try {
                const response = await axios.get(pageUrl);
                const $ = cheerio.load(response.data);
                const pdfLinks = [];
                $('a[href*=".pdf"]').each((i, element) => {
                    const relativeUrl = $(element).attr('href');
                    const pdfUrl = new URL(relativeUrl, pageUrl).href;
                    pdfLinks.push(pdfUrl);
                });

                if (pdfLinks.length === 0) {
                    return { success: false, message: 'No PDF links found on the page.' };
                }

                const results = await Promise.all(pdfLinks.map(url => downloadPdf(url, folder)));
                return { success: true, results, folderPath: folder };
            } catch (error) {
                return { success: false, message: `Failed to fetch page ${pageUrl}: ${error.message}` };
            }
        }

        const result = await downloadPdfsFromPage(url, uniqueFolder);
        if (result.success) {
            res.status(200).json({ message: result.results.map(r => r.message), folderPath: result.folderPath });
        } else {
            res.status(500).json({ message: result.message });
        }
    } else {
        res.status(405).send('Method Not Allowed');
    }
};
