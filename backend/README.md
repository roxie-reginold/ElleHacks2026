# Whisper Lite Backend

## Scripts

| Command | What it does |
|--------|----------------|
| **`npm run dev`** | **Run the server** (use this during development). Keeps running until you stop it. Listens on port 3001. |
| `npm run build` | Compile TypeScript only. **Exits when done** — that’s normal, not a crash. |
| `npm start` | Run the compiled server (`node dist/index.js`). Use after `npm run build` for production. |

To have the API and help-requests working, start the server with:

```bash
npm run dev
```

Leave that terminal open. “Waiting for the debugger to disconnect” after `npm run build` just means the build finished and the Node process exited.
