# Clef Bot
![Clef Bot](https://img.icons8.com/bubbles/2x/bass-clef.png)
### What do I do?
- Adds rhythm game related commands to query and retrieve data from specific related websites
- Allows for server-specific custom commands that return content when called
- Saves anything logged into files on the local host
# How to use:

### Invite bot to server
1. Click this link to add to your discord server (must have the MANAGE SERVER permission)\
   https://discordapp.com/oauth2/authorize?client_id=664013977549799424&scope=bot&permissions=8
   
### Cloning repo
1. Clone repo to directory
1. Navigate a command prompt to that directory
1. Run `npm install` *(requires Node.js to be installed)*
1. Create a new `auth.json` (see example below)
1. Run `node bot.js` to start the bot *(requires Node.js to be installed)*
1. Add it to your server using this link (replace `YOUR_CLIENT_ID_HERE` with your bot's Client ID):\
   https://discordapp.com/oauth2/authorize?client_id=YOUR_CLIENT_ID_HERE&scope=bot&permissions=8*
   
#Example auth.js
```json
{
  "discordToken" : "<Your bot's authentication token here>",
  "osuToken": "<osu! auth token here>"
}
``` 
*Note that the bot currently requires administrator privileges, this will be changed in the future
### Planned features:
- Customize prefix used for commands
- Allow for role selection using emotes
- Word filter
- Able to play music in voice channels
- 2FA using email of choice (for organizations)
- Custom prefixes
