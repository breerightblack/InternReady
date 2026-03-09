# InternReady

**AI Resume Builder for College Students**

Build a professional, ATS-optimized internship resume in minutes — powered by Claude AI.

**Live Site:** [internready.netlify.app](https://internready.netlify.app)

## Features

- 5-step guided resume form (Personal, Education, Experience, Skills, Preview)
- AI-generated resume content tailored for internships
- 8 color themes and 8 font options
- Inline editing on the generated resume
- Export to PDF, Word (.doc), and Google Docs
- Profile photo upload support
- Rate limiting to prevent API abuse

## Tech Stack

- **Frontend:** React + Vite
- **AI:** Claude API (Anthropic)
- **Hosting:** Netlify
- **Serverless:** Netlify Functions

## Getting Started

```bash
npm install
npm run dev
```

## Environment Variables

Add to Netlify (or `.env` for local dev):

```
ANTHROPIC_API_KEY=your_api_key_here
```

## License

MIT
