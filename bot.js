const fs = require('fs');
const nconf = require('nconf');
const Discord = require('discord.js');
const client = new Discord.Client();
const {discordToken} = require('./auth');
const commands = require('./botCommands');

fs.access("./guilds", err => {
	if (err) {
		fs.mkdir('./guilds', err1 => {
			if (err1) console.log(err1);
			else console.log('Successful creation of ./guilds/ dir!')
		});
	}
});

client.login(discordToken).then(null, (e) => {
	console.log(e);
});

client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`);
	
	for (let i = 0; i < client.guilds.size; i++) {
		let guildID = client.guilds.array()[i].id;
		// checks if guild's folder exists
		fs.access(`./guilds/${guildID}`, error => {
			if (error) {
				// The check failed and folder does not exist
				fs.mkdir(`./guilds/${guildID}`, err1 => {
					if (err1) console.log(err1);
					else console.log(`Successfully created ./guilds/${guildID} ...`);
				});
				
			}
			verify(guildID);
		});
		
	}
});

client.on('message', msg => {
	// command handling
	if (msg.content.startsWith("$") && msg.guild && msg.author !== client.user) {
		let s = msg.content.toLowerCase().split(/[\n ]+/msg, 3);
		
		function getCmd(string) {
			if (string in commands) return commands[string];
			else for (let key in commands) if (commands[key].aliases) if (string in commands[key].aliases) {
				return commands[key];
			}
		}
		
		let command = s[0].substr(1);
		switch (s.length) {
			case 0:
				//msg.channel.send(`Command does not exist! Use ${msg.content.charAt(0)}help for a list of commands`);
				break;
			case 1:
				//if it's help, just get help
				if (command === 'help') commands.help.command(msg);
				//if it's something else by itself, find the command (or its aliases) and get help
				else if (getCmd(command)) getCmd(command).command(msg, 'help');
				//if it's anything else, search for a custom command in the guild's customCommands.json
				else {
					nconf.file(`./guilds/${msg.guild.id}/customCommands.json`);
					nconf.load();
					if (nconf.get(command)) {
						let message = nconf.get(`${command}:message`);
						let attachments = nconf.get(`${command}:attachments`);
						msg.channel.send(message, {files: attachments}).catch(() => msg.reply(
							"Something went wrong! Message the bot owner for info"
						));
					}
					//some else statement here about command not existing or something...
					nconf.remove();
				}
				break;
			default:
				if (getCmd(command)) getCmd(command).command(msg, s[1]);
				break;
		}
	}
});

client.on('messageDelete', msg => {
	module.exports.logDelMsg(msg);
});

client.on('guildCreate', guild => {
	let guildID = guild.id;
	fs.mkdir(`./guilds/${guildID}`, err1 => {
		if (err1) console.log(err1);
		else console.log(`Successfully created ./guilds/${guildID} ...`);
	});
	verify(guildID)
});

client.on('guildDelete', guild => {
	fs.rmdir(`./guilds/${guild.id}`, {recursive: true}, err => {
		if (err) console.log(err);
		else console.log(`Config file for <${guild.id}> has been successfully deleted!`);
	});
});

function verify(guildID) {
	const filePath = `./guilds/${guildID}/config.json`;
	const guild = client.guilds.get(guildID);
	const guildName = guild.name;
	const owner = guild.owner;
	if (!fs.existsSync(filePath)) fs.writeFileSync(`./guilds/${msg.guild.id}/customCommand.json`, '{}');
	if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '{}');
	console.log(`Verifying <${guildName}>'s config file ...`);
	let auditChanID = nconf.get('auditChannelID');
	nconf.file(filePath);
	nconf.load();
	if (auditChanID === undefined || !guild.channels.has(auditChanID)) nconf.set('auditChannelID', undefined);
	nconf.set('guildName', guildName);
	nconf.save(err => {
		if (err) {
			console.log(err);
			owner.send(`Verification for <${guildName}>'s config file has failed, check console/ask bot owner for details`);
		} else (console.log(`Config file for <${guildName}> has been successfully verified!`));
	});
	nconf.remove();
}

exports.logDelMsg = (msg) => {
	if (!msg.author.bot && msg.guild) {
		nconf.file(`./guilds/${msg.guild.id}/config.json`);
		nconf.load();
		if (!nconf.get('audit')) {
			nconf.remove();
			return;
		}
		nconf.remove();
		let date = msg.createdAt;
		let logDir = `./guilds/${msg.guild.id}/logs/`;
		let logFilePath = `${logDir + (date.getMonth() + 1)}-${date.getDate()}-${date.getFullYear()}.txt`;
		if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
		fs.appendFileSync(logFilePath, `\n(${date.getHours()}:${date.getMinutes()}:${date.getMilliseconds()}) ` +
			`${msg.author} ${msg.author.tag} had their message deleted in ${msg.channel}: ${msg.content}`, err => {
			if (err) console.log(err)
		});
		if (msg.attachments.size !== 0) {
			let attachArr = msg.attachments.array();
			fs.appendFileSync(logFilePath, '\n ---> Attachment links: ', err => {
				if (err) console.log(err);
			});
			for (let i = 0; i < attachArr.length; i++) {
				fs.appendFileSync(logFilePath, `\n     ---> ${attachArr[i].proxyURL}`, err => {
					if (err) console.log(err)
				});
			}
		}
		let auditChannel = client.channels.get(nconf.get('auditChannelID'));
		if (auditChannel) {
			//rich embed deleted message
			let richEmbed = new Discord.RichEmbed()
				.setTitle(`Deleted message in ${msg.channel.name}`)
				.setColor('82001d')
				.setThumbnail(msg.author.avatarURL)
				.setAuthor(msg.author.tag)
				.setDescription(msg.content)
				.setTimestamp();
			if (msg.attachments.size !== 0) {
				let attachArr = msg.attachments.array();
				richEmbed.setFooter('✅ Attachments (above)');
				let attachments = [];
				for (let i = 0; i < attachArr.length; i++) {
					try {
						attachments.push(attachArr[i].proxyURL);
					} catch (err) {
						console.log(err);
						richEmbed.setFooter('⚠ Failed to get attachments');
					}
				}
				richEmbed.attachFiles(attachments);
			} else richEmbed.setFooter('❌ Attachments');
			auditChannel.send(richEmbed);
		}
	}
};