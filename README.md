# SpaceChat.live

A real-time audio chat platform that connects users randomly for meaningful conversations. Built with Vue.js, Socket.IO, and WebRTC.

## Features

- Random matching with other online users
- Real-time audio communication using WebRTC
- Text chat alongside audio
- Filters for matching preferences
- Interactive mini-games to play with connections
- Chat history and reconnection options
- Mobile-responsive design

## Tech Stack

- **Frontend**: Vue 3, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, Socket.IO
- **Communication**: WebRTC for peer-to-peer audio
- **Build Tools**: Vite, npm

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/spacechat-live.git
   cd spacechat-live
   ```

2. Install dependencies for client, server, and root:
   ```
   npm run install:all
   ```

### Running for Development

Start both the client and server concurrently:
```
npm start
```

Or run them separately:
```
# Client (in one terminal)
npm run client

# Server (in another terminal)
npm run server
```

The client will be available at http://localhost:5173 and the server at http://localhost:3000.

### Building for Production

```
npm run build
```

This will create optimized builds in the `client/dist` and `server/dist` directories.

## Project Structure

```
spacechat-live/
├── client/                 # Frontend Vue application
│   ├── public/             # Static assets
│   └── src/                # Vue source code
│       ├── assets/         # Images, styles, etc.
│       ├── components/     # Vue components
│       ├── services/       # API services
│       ├── views/          # Vue views/pages
│       └── router/         # Vue Router
│
├── server/                 # Backend Node.js application
│   ├── src/                # Server source code
│   │   ├── controllers/    # Route controllers
│   │   ├── models/         # Data models
│   │   ├── routes/         # API routes
│   │   └── socket/         # Socket.IO event handlers
│   └── dist/               # Compiled server code
│
└── shared/                 # Shared code between client and server
    └── types/              # TypeScript types/interfaces
```

## License

MIT
