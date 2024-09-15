const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');
const { URL } = require('url');

// Set the folder path to the 'pdfs' folder on the desktop
const desktopPath = path.join(require('os').homedir(), 'Desktop', 'pdfs');

// Display the path where PDFs will be saved
console.log(`PDFs will be saved to: ${path.resolve(desktopPath)}`);

// Function to download PDF
async function downloadPdf(url, folder = desktopPath) {
    if (!fs.existsSync(folder)) {
        await fs.mkdir(folder, { recursive: true });
    }

    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const pdfName = path.basename(new URL(url).pathname); // Extract filename from URL
        const pdfPath = path.join(folder, pdfName); // Create path to save PDF

        await fs.writeFile(pdfPath, response.data); // Write PDF file to disk
        console.log(`Downloaded: ${pdfName}`);
        console.log(`File saved to: ${path.resolve(pdfPath)}`); // Print the full path
    } catch (error) {
        console.error(`Failed to download PDF from ${url}:`, error.message);
    }
}

// Function to find and download all PDFs from a given page
// Function to find and download all PDFs from a given page
// Function to find and download all PDFs from a given page
async function downloadPdfsFromPage(pageUrl) {
    try {
        const response = await axios.get(pageUrl);
        const $ = cheerio.load(response.data);

        // Find all anchor tags with href attributes containing .pdf
        $('a[href*=".pdf"]').each(async (i, element) => {
            // Convert relative URL to absolute URL
            const relativeUrl = $(element).attr('href');
            const pdfUrl = new URL(relativeUrl, pageUrl).href;

            console.log(`Found PDF URL: ${pdfUrl}`); // Log found URLs for debugging
            await downloadPdf(pdfUrl);
        });

        // If no PDFs are found
        if ($('a[href*=".pdf"]').length === 0) {
            console.log('No PDF links found on the page.');
        }
    } catch (error) {
        console.error(`Failed to fetch page ${pageUrl}:`, error.message);
    }
}

// Example usage
const pageUrl = 'https://sra.maryland.gov/proxy-vote-record'; // Provided URL
downloadPdfsFromPage(pageUrl).catch(console.error);



