const express = require('express')
const cors = require('cors')
const ytdl = require('@distube/ytdl-core')
const fs = require('fs')
const ffmpeg = require('fluent-ffmpeg');
const { exec } = require('child_process');
const axios = require('axios')
const { YoutubeTranscript } = require('youtube-transcript');
const path = require('path');
const app = express();
require('dotenv').config();

const API_KEY = process.env.API_KEY

app.use(cors())
app.use(express.json())

app.get('/download/video', async (req, res) => {
    const videoURL = req.query.url

    if (!ytdl.validateURL(videoURL)) {
        return res.status(400).send({ error: 'Invalid YouTube URL' })
    }

    try {
        const info = await ytdl.getInfo(videoURL)
        const videoTitle = info.videoDetails.title
            .replace(/[\/\\?%*:|"<>]/g, '')
            .split(" ")
            .slice(0, 3)
            .join("_")

        console.log('Video Title:', videoTitle)

        const videoFormat = info.formats.find(f => f.hasVideo && !f.hasAudio && f.container === 'mp4')
        const audioFormat = info.formats.find(f => !f.hasVideo && f.hasAudio && f.container === 'mp4')

        console.log('Selected VIDEO format:', videoFormat)
        console.log('Selected AUDIO format:', audioFormat)

        if (!videoFormat || !audioFormat) {
            return res.status(404).send({ error: 'No suitable audio or video format found' })
        }

        const downloadsDir = path.join(__dirname, 'downloads')

        if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir)

        const videoPath = path.join(downloadsDir, `video.${videoFormat.container}`)
        const audioPath = path.join(downloadsDir, `audio.${audioFormat.container}`);
        const convertedAudioPath = path.join(downloadsDir, 'audio.aac');
        const mergedMedia = path.join(downloadsDir, `${videoTitle}.mp4`);

        // Step 1: Download Video
        await new Promise((resolve, reject) => {
            const videoStream = ytdl(videoURL, { format: videoFormat })
            const fileStream = fs.createWriteStream(videoPath)

            videoStream.pipe(fileStream)

            videoStream.on('progress', (_, downloaded, total) => {
                console.log(`Video downloading... ${((downloaded / total) * 100).toFixed(2)}%`)
            })

            fileStream.on('finish', () => {
                console.log('VIDEO Download and File Writing Completed')
                resolve()
            })

            fileStream.on('error', err => {
                console.error('Error writing VIDEO file:', err)
                reject(err)
            })
        })

        // Step 2: Download Audio
        await new Promise((resolve, reject) => {
            const audioStream = ytdl(videoURL, { format: audioFormat })
            const audioFileStream = fs.createWriteStream(audioPath)

            audioStream.pipe(audioFileStream)

            audioStream.on('progress', (_, downloaded, total) => {
                console.log(`Audio downloading... ${((downloaded / total) * 100).toFixed(2)}%`)
            })

            audioFileStream.on('finish', () => {
                console.log('AUDIO Download and File Writing Completed')
                resolve()
            })

            audioFileStream.on('error', err => {
                console.error('Error writing AUDIO file:', err)
                reject(err)
            })
        })

        // Step 3: Convert audio to AAC
        await new Promise((resolve, reject) => {
            ffmpeg(audioPath)
                .audioCodec('aac')
                .save(convertedAudioPath)
                .on('end', () => {
                    console.log('Audio converted to AAC format.')
                    resolve()
                })
                .on('error', (err) => {
                    console.error('Error during audio conversion:', err)
                    reject(err)
                })
        })

        // Step 4: Merge video and audio
        ffmpeg()
            .input(videoPath)
            .input(convertedAudioPath)
            .outputOptions('-c:v copy')
            .outputOptions('-c:a aac')
            .save(mergedMedia)
            .on('end', () => {
                console.log('Merging done!')
                res.setHeader('Content-Disposition', `attachment; filename="${videoTitle}.mp4"`)
                res.setHeader('Content-Type', 'video/mp4')

                const stream = fs.createReadStream(mergedMedia)
                stream.pipe(res)

                stream.on('end', () => {
                    console.log('Response streaming completed')

                    fs.unlink(videoPath, err => {
                        if (err) console.error(`Error deleting ${videoPath}:`, err)
                        else console.log(`Deleted ${videoPath}`)
                    })

                    fs.unlink(audioPath, err => {
                        if (err) console.error(`Error deleting ${audioPath}:`, err)
                        else console.log(`Deleted ${audioPath}`)
                    })

                    fs.unlink(convertedAudioPath, err => {
                        if (err) console.error(`Error deleting ${convertedAudioPath}:`, err)
                        else console.log(`Deleted ${convertedAudioPath}`)
                    })

                    fs.unlink(mergedMedia, err => {
                        if (err) console.error(`Error deleting ${mergedMedia}:`, err)
                        else console.log(`Deleted ${mergedMedia}`)
                    })

                })
            })
            .on('error', (err) => {
                console.error('Error during merging:', err)
                res.status(500).send({ error: 'Internal Server Error during merging' })
            })

    } catch (error) {
        console.error('Overall error:', error)
        res.status(500).send({ error: 'Internal Server Error, Try Again!!' })
    }
})

app.get('/download/audio', (req, res) => {

    console.log(req.query.url)
    if (!ytdl.validateURL(req.query.url)) {
        return res.status(400)
            .send({ error: 'Invalid YouTube URL' })
    } else {
        console.log(req.query.url)
    }

    try {

        const videoURL = req.query.url

        ytdl.getInfo(videoURL)
            .then((info) => {

                const videoTitle = info.videoDetails.title
                    .replace(/[\/\\?%*:|"<>]/g, '')
                    .split(" ")
                    .slice(0, 3)
                    .join("_")

                // console.log(info)

                const audioFormat = info
                    .formats
                    .find(f => !f.hasVideo && f.hasAudio && f.container === 'mp4')

                if (!audioFormat) {
                    console.log('No suitable audio format found');
                    return res.status(404)
                        .send({ error: 'No suitable audio format found' });
                }

                return {
                    title: videoTitle,
                    audioFormat: audioFormat
                }

            })
            .then(async (details) => {
                try {

                    await new Promise((resolve, reject) => {

                        const downloadsDir = path.join(__dirname, 'downloads')

                        if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir)

                        const audioPath = path.join(downloadsDir, `${details.title}.${details.audioFormat.container}`);
                        const outputPath = path.join(downloadsDir, 'audio.mp3');

                        const audioOutputStream =
                            ytdl(videoURL, {
                                filter: 'audioonly'
                            })
                                .pipe(fs
                                    .createWriteStream(audioPath)
                                )

                        audioOutputStream.on('finish', () => {
                            console.log('AUDIO File writing completed')
                            resolve(details)

                            const command = `ffmpeg -i ${audioPath} -q:a 0 -map a ${outputPath}`

                            exec(command, (err, stdout, stderr) => {
                                if (err) {
                                    console.error(`Error converting to MP3: ${err}`);
                                    return res.status(500).json({ error: 'Error converting to MP3' });
                                }

                                res.setHeader('Content-Disposition', `attachment; filename="audio.mp3"`);
                                res.setHeader('Content-Type', `audio/mpeg`);

                                const audioStream = fs.createReadStream(outputPath)
                                console.log('response sent')
                                audioStream.pipe(res)
                                audioStream.on('end', () => {
                                    console.log('audio streaming completed')
                                    fs.unlink(outputPath, (err) => {
                                        if (err) throw err
                                        console.log(`Deleted audio`)

                                    })
                                })

                            })
                        })


                        audioOutputStream.on('error', (err) => {
                            console.log('Error in writing AUDIO file')
                            reject(err)
                        })
                    })

                } catch (err) {
                    console.log(`Error while downloading: ${err}`)
                    res.status(500)
                        .send({
                            error: 'Internal Server error, Try Again!!'
                        })
                }

            })
            .catch(err => {
                console.log('Error: ', err)
                res.status(500)
                    .send({
                        error: 'Internal Server error, Try Again!!'
                    })
            })

    } catch (error) {
        console.log(error)
        res.status(500)
            .send({
                error: 'Internal Server Error, Try Again!!'
            })
    }

})

app.get('/summarize-video', async (req, res) => {

    if (!ytdl.validateURL(req.query.url)) {
        return res.status(400).send({ error: 'Invalid YouTube URL' })
    }

    const videoURL = req.query.url

    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/)|youtu\.be\/)([^?&]+)/;
    const videoId = videoURL.match(regex)[1];

    try {
        const transcriptArray = await YoutubeTranscript.fetchTranscript(videoId)
        const transcriptText = transcriptArray.map(item => {
            const seconds = Math.floor(item.offset / 1000);
            const timestamp = new Date(seconds * 1000).toISOString().substr(11, 8);
            return `• [${timestamp}] ${item.text}`;
        }).join('\n');

        const prompt = {
            contents: [
                {
                    parts: [
                        {
                            text: `You are an expert summarizer. Here is a well-structured transcript of a YouTube video, broken down by timestamp.

                                    Your task is to provide a **detailed and structured summary** that includes **all key points**, in the same order as the transcript. Don't skip or merge ideas. Also, avoid such sentences in the starting 'Here is a detailed and structured summary of the'

                                    Here is the transcript:

                                    ${transcriptText}`
                        }
                    ]
                }
            ]
        };

        const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
            prompt, {
            headers: {
                'Content-Type': 'application/json'
            }
        })

        let summary = response.data.candidates[0].content.parts[0].text

        res.json({ summary: summary });

    } catch (error) {
        console.error("Error fetching data: ", error);
    }
})


app.listen(3000, () => {
    console.log(`Server is running at http://localhost:3000`);
}
)