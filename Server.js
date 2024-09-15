const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');
const { URL } = require('url');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;

// Middleware to parse JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Function to download PDF
async function downloadPdf(url, folder) {
    if (!fs.existsSync(folder)) {
        await fs.mkdir(folder, { recursive: true });
    }

    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const pdfName = path.basename(new URL(url).pathname); // Extract filename from URL
        const pdfPath = path.join(folder, pdfName); // Create path to save PDF

        await fs.writeFile(pdfPath, response.data); // Write PDF file to disk
        return { success: true, message: `Downloaded: ${pdfName}`, path: pdfPath };
    } catch (error) {
        return { success: false, message: `Failed to download PDF from ${url}: ${error.message}` };
    }
}

// Function to find and download all PDFs from a given page
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

// Route to handle form submission and download PDFs
app.post('/download', async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).send('URL is required');
    }

    // Create a unique folder for each request
    const uniqueFolder = path.join(require('os').homedir(), 'Desktop', 'pdfs', uuidv4());

    const result = await downloadPdfsFromPage(url, uniqueFolder);
    if (result.success) {
        res.send(`
            <h1>PDFs Downloaded</h1>
            <ul>
                ${result.results.map(r => `<li>${r.message}</li>`).join('')}
            </ul>
            <p>All PDFs have been saved to the folder:</p>
            <p><strong>${result.folderPath}</strong></p>
            <p>You can access your folder at: <a href="file://${result.folderPath}" target="_blank">Click here</a></p>
            <a href="/">Go Back</a>
        `);
    } else {
        res.send(`
            <h1>Error</h1>
            <p>${result.message}</p>
            <a href="/">Go Back</a>
        `);
    }
});

// Route to serve the HTML form
app.get('/', (req, res) => {
    res.send(`
        <h1>PDF Downloader</h1>
        <form action="/download" method="post">
            <label for="url">Enter the page URL:</label><br>
            <input type="text" id="url" name="url" required><br><br>
            <input type="submit" value="Download PDFs">
        </form>
    `);
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
