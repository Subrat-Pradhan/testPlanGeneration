# 🧪 AI Test Plan Generator

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://testplangeneration.netlify.app/)

> **Generate comprehensive, AI-powered test plans instantly—100% in your browser. No data storage, no tracking, completely privacy-first.**

A stateless, frontend-only web application that leverages AI (OpenAI GPT-4 or Google Gemini) to generate professional test plans from your requirements documents. Everything runs locally in your browser—your data never leaves your machine.

🔗 **[Try it now →](https://testplangenerator.netlify.app/)**

---

## ✨ Features

- 🤖 **AI-Powered Generation** - Supports OpenAI GPT-4 and Google Gemini
- 🔐 **100% Privacy-First** - No server, no database, no tracking
- 📄 **Multiple File Formats** - Upload PDF or TXT requirements
- 👥 **Team Management** - Add testers with roles and experience levels
- 📅 **Timeline Planning** - Set project start and end dates
- 📊 **Rich Output** - Markdown formatting with tables and diagrams
- 💾 **PDF Export** - Download your test plan as a PDF
- 🎨 **Modern UI** - Beautiful glassmorphism design with dark/light mode
- 🚀 **Zero Setup** - No installation required, works instantly

---

## 🚀 How to Use

### 1. **Get an API Key**

You'll need an API key from one of these providers:

- **OpenAI (GPT-4)**: [Get API Key](https://platform.openai.com/account/api-keys)
- **Google Gemini**: [Get API Key](https://makersuite.google.com/app/apikey)

> 💡 **Note**: Your API key is stored locally in your browser's session storage and never sent to any server except the AI provider.

### 2. **Configure the App**

1. Select your AI provider (OpenAI or Google Gemini)
2. Enter your API key
3. Click **Save** - your key is stored locally in your browser

### 3. **Upload Requirements**

- Click the upload area or drag & drop your requirements document
- Supported formats: **PDF** or **TXT**
- The app will extract text from your document

### 4. **Set Timeline**

- Choose a **Start Date** and **End Date** for your testing phase
- Dates must be in the future

### 5. **Add Team Members**

- Click **+ Add** to add testers
- For each tester, specify:
  - **Name**
  - **Role** (e.g., QA Engineer, Test Lead, Automation Engineer)
  - **Experience Level** (1-10 scale)
- Remove testers using the **×** button

### 6. **Generate Test Plan**

- Click **Generate Test Plan**
- The AI will analyze your requirements and create a comprehensive test plan
- Wait for the generation to complete (usually 10-30 seconds)

### 7. **Export Your Plan**

- Review the generated test plan
- Click **Download PDF** to save it as a PDF document

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3 (Tailwind CSS), Vanilla JavaScript
- **AI Integration**: OpenAI API, Google Gemini API
- **Markdown Rendering**: [Marked.js](https://marked.js.org/)
- **Diagram Support**: [Mermaid.js](https://mermaid.js.org/)
- **PDF Processing**: [PDF.js](https://mozilla.github.io/pdf.js/)
- **PDF Export**: [html2pdf.js](https://github.com/eKoopmans/html2pdf.js)
- **Hosting**: Netlify
- **Typography**: [Inter Font](https://fonts.google.com/specimen/Inter)

---

## 🔒 Privacy & Security

This application is built with privacy as the **#1 priority**:

| Feature | Description |
|---------|-------------|
| 🚫 **No Backend** | Runs entirely in your browser—no server-side processing |
| 🔐 **Local Storage Only** | API keys stored in browser session storage |
| 📡 **Direct API Calls** | Your data goes directly to AI provider, nowhere else |
| 🕵️ **No Tracking** | Zero analytics, cookies, or user tracking |
| 💾 **No Data Retention** | Nothing is saved or logged anywhere |
| 🌐 **Stateless** | Refresh the page and everything is cleared |

> **Your requirements documents and test plans never touch our servers because we don't have any servers!**

---

## 📦 Installation & Local Development

Want to run it locally or contribute? Here's how:

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- A text editor (VS Code, Sublime, etc.)

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/testPlanGeneration.git
   cd testPlanGeneration
   ```

2. **Open in browser**
   ```bash
   # Simply open index.html in your browser
   # Or use a local server (recommended):
   
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js (http-server)
   npx http-server
   ```

3. **Access the app**
   - Open `http://localhost:8000` in your browser
   - That's it! No build process, no dependencies to install.

---

## 🤝 Contributing

We welcome contributions! This is an **open-source project** and we'd love your help to make it better.

### Ways to Contribute

- 🐛 Report bugs
- 💡 Suggest new features
- 📝 Improve documentation
- 🎨 Enhance UI/UX
- 🔧 Submit pull requests

### Development Guidelines

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly in multiple browsers
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## 📄 License

This project is **open source** and available under the [MIT License](LICENSE).

```
MIT License

Copyright (c) 2025 AI Test Plan Generator

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

## 🌟 Why This Project?

Traditional test planning is:
- ⏰ Time-consuming
- 📋 Repetitive
- 🔄 Inconsistent across teams

**This tool solves that by:**
- ⚡ Generating plans in seconds
- 🎯 Ensuring comprehensive coverage
- 🤖 Leveraging AI best practices
- 🔒 Keeping your data private

---

## 🎯 Roadmap

- [ ] Support for more AI providers (Claude, Llama, etc.)
- [ ] Custom test plan templates
- [ ] Test case export to JIRA/TestRail
- [ ] Multi-language support
- [ ] Collaborative editing features
- [ ] Integration with CI/CD pipelines

---

## 💬 Support

- 🐛 **Found a bug?** [Open an issue](https://github.com/yourusername/testPlanGeneration/issues)
- 💡 **Have a feature request?** [Start a discussion](https://github.com/yourusername/testPlanGeneration/discussions)
- 📧 **Need help?** Contact us at support@example.com

---

## 🙏 Acknowledgments

- Built with ❤️ for the QA community
- Powered by OpenAI and Google Gemini
- Inspired by the need for better, faster test planning

---

<div align="center">

**[⭐ Star this repo](https://github.com/yourusername/testPlanGeneration)** if you find it useful!

Made with 🧪 by testers, for testers.

</div>
