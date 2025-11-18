# Quick Start Guide - Independent Graph Plugin

## 🚀 30-Second Setup

### 1. Start the Plugin Server

Open a terminal in the `portable-local-graph` folder:

```bash
cd portable-local-graph
node graph-server.js
```

You should see:
```
Graph plugin database initialized
Graph database ready
Graph plugin server running on http://localhost:3001
```

### 2. Open the Plugin

**Option A**: From Main App (Recommended)
1. Start Luhmann Roam (if not already running)
2. Click the "📊 Graph Plugin" button in the sidebar
3. Plugin opens in a modal dialog inside the app
4. Click the ⛶ button to toggle fullscreen

**Option B**: Direct Access
- Open your browser to: `http://localhost:3001/index.html`

### 3. Start Creating!

- Click "Add Node" then click on canvas to create nodes
- Click "Add Edge" then click two nodes to connect them
- Everything is automatically saved!

## 🎨 What You Can Do

### Create Nodes
1. Click **"Add Node"** button
2. Click anywhere on canvas
3. Node appears and saves instantly

### Connect Nodes
1. Click **"Add Edge"** button
2. Click first node (source)
3. Click second node (target)
4. Connection appears and saves

### Move Things Around
1. Make sure **"Select"** mode is active
2. Drag any node to new position
3. Position saves when you release

### Edit Properties
1. **Right-click** on any node or edge
2. Choose **"Edit"**
3. Change the properties
4. Saves automatically!

### View Full Content
- **Hover** over any node to see its full content in a tooltip

## 💾 Your Data

- All changes save **automatically** to `graph.db`
- Database is in the `portable-local-graph` folder
- **Completely independent** from main app database
- No connection to your Luhmann Roam notes

## 📦 Import/Export

### Save Graph as File
- Click **"Save"** button
- Downloads JSON file
- Use for backups or sharing

### Load Graph from File
- Click **"Load"** button
- Select a JSON file
- Replaces current graph

⚠️ **Warning**: Loading a file replaces ALL current data in the database!

## 🎯 Quick Tips

1. **Hover to see full text** - Labels are truncated, tooltips show everything
2. **Right-click for menu** - Fastest way to edit or delete
3. **Save backups** - Export to JSON before major changes
4. **Independent data** - This graph is separate from your notes
5. **Keep server running** - Don't close the terminal window

## ⚡ Example Workflow

**Creating a Simple Mind Map:**

1. Start server: `node graph-server.js`
2. Open plugin from main app
3. Click "Add Node", place center node
4. Right-click it, edit to "Main Idea"
5. Add more nodes around it
6. Use "Add Edge" to connect them
7. Drag nodes to arrange nicely
8. Click "Save" to export as backup

Done! Your graph is saved in the database.

## 🔧 Troubleshooting

**Button says "server not running"?**
→ Run `node graph-server.js` in the `portable-local-graph` folder

**Nothing saves?**
→ Check the terminal for error messages

**Want to start fresh?**
→ Click "Clear" button or delete `graph.db` file

## 📚 Next Steps

- Read the full [README.md](README.md) for detailed features
- Check the [API documentation](README.md#api-endpoints) for integration
- Explore different graph structures and use cases

**Ready to create amazing graphs!** 🎉
