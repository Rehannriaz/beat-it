import { Router } from 'express';
import multer from 'multer';
import { songController } from '../controllers/songController';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3') {
      cb(null, true);
    } else {
      cb(new Error('Only MP3 files are allowed'));
    }
  },
});

/**
 * @swagger
 * /songs:
 *   get:
 *     summary: Get all songs
 *     description: Retrieves a list of all uploaded songs
 *     tags:
 *       - Songs
 *     responses:
 *       200:
 *         description: List of songs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Song'
 */
router.get('/', songController.getAll);

/**
 * @swagger
 * /songs/{id}:
 *   get:
 *     summary: Get song by ID
 *     description: Retrieves a specific song by its ID
 *     tags:
 *       - Songs
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Song ID
 *     responses:
 *       200:
 *         description: Song found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Song'
 *       404:
 *         description: Song not found
 */
router.get('/:id', songController.getById);

/**
 * @swagger
 * /songs/{id}/pattern:
 *   get:
 *     summary: Get song pattern
 *     description: Retrieves the game pattern data for a specific song
 *     tags:
 *       - Songs
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Song ID
 *     responses:
 *       200:
 *         description: Pattern data (may be null if not yet created)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/GamePattern'
 *       404:
 *         description: Song not found
 */
router.get('/:id/pattern', songController.getPattern);

/**
 * @swagger
 * /songs/upload:
 *   post:
 *     summary: Upload a new song
 *     description: Uploads an MP3 file to Supabase Storage and creates a song record
 *     tags:
 *       - Songs
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: MP3 audio file
 *               title:
 *                 type: string
 *                 description: Song title (defaults to filename if not provided)
 *               artist:
 *                 type: string
 *                 description: Artist name
 *               duration:
 *                 type: number
 *                 description: Song duration in seconds
 *               bpm:
 *                 type: integer
 *                 description: Beats per minute
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard, expert]
 *                 description: Difficulty level
 *     responses:
 *       201:
 *         description: Song uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Song'
 *       400:
 *         description: Invalid request (no file or invalid file type)
 */
router.post('/upload', upload.single('file'), songController.upload);

/**
 * @swagger
 * /songs/{id}/pattern:
 *   put:
 *     summary: Update song pattern
 *     description: Sets or updates the game pattern data for a song
 *     tags:
 *       - Songs
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Song ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pattern
 *             properties:
 *               pattern:
 *                 $ref: '#/components/schemas/GamePattern'
 *     responses:
 *       200:
 *         description: Pattern updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Song'
 *       404:
 *         description: Song not found
 */
router.put('/:id/pattern', songController.updatePattern);

/**
 * @swagger
 * /songs/{id}:
 *   delete:
 *     summary: Delete a song
 *     description: Deletes a song and its associated file from storage
 *     tags:
 *       - Songs
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Song ID
 *     responses:
 *       204:
 *         description: Song deleted successfully
 *       404:
 *         description: Song not found
 */
router.delete('/:id', songController.delete);

/**
 * @swagger
 * /songs/{id}/analyze:
 *   post:
 *     summary: Analyze song audio
 *     description: Extracts audio features (BPM, beats, energy levels) using the audio analysis service
 *     tags:
 *       - Songs
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Song ID
 *     responses:
 *       200:
 *         description: Audio features extracted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/AudioFeatures'
 *       404:
 *         description: Song not found
 *       500:
 *         description: Audio analysis failed
 */
router.post('/:id/analyze', songController.analyze);

/**
 * @swagger
 * /songs/{id}/generate-pattern:
 *   post:
 *     summary: Generate game pattern with AI
 *     description: Analyzes audio and generates a game pattern using AI (OpenAI or Gemini)
 *     tags:
 *       - Songs
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Song ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - difficulty
 *             properties:
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard, expert]
 *                 description: Difficulty level for pattern generation
 *               provider:
 *                 type: string
 *                 enum: [openai, gemini]
 *                 description: AI provider to use (defaults to openai)
 *     responses:
 *       200:
 *         description: Pattern generated and saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Song'
 *       400:
 *         description: Invalid request (missing difficulty)
 *       404:
 *         description: Song not found
 *       500:
 *         description: Pattern generation failed
 */
router.post('/:id/generate-pattern', songController.generatePattern);

export const songRoutes = router;
