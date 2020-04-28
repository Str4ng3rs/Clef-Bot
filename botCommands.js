const nconf = require('nconf');
const {RichEmbed} = require('discord.js');
const Command = require('./structures/Command');
const chorus = require('./chorus');
const ow = require('./ow');
const osu = require('./osu');
const bot = require('./bot');

module.exports = {
	ping: new Command(msg => {
		msg.reply('Pong!')
	})
		.setDescription('Pings the bot, replies with "Pong!"'),
	ow: new Command(async (msg, option) => {
		if (option) {
			if (option in ow) {
				ow[option].command(msg);
				return;
			}
			for (let key in ow)
				if (option in ow[key + ''].aliases) {
					ow[key + ''].command(msg);
					return;
				}
			msg.channel.send(`Invalid input received. Use \`${msg.content.charAt(0)}ow help\` for available commands`)
		} else return ow;
	})
		.setDescription('Retrieves Overwatch stats for user.')
		.setUsage(`[${Object.keys(ow).filter(key => key !== 'help').join(' | ')}]`),
	chorus: new Command(async (msg, option) => {
		if (option) {
			if (option in chorus) {
				chorus[option].command(msg);
				return;
			}
			for (let key in chorus)
				if (option in chorus[key + ''].aliases) {
					chorus[key + ''].command(msg);
					return;
				}
			msg.channel.send(`Invalid input received. Use \`${msg.content.charAt(0)}chorus help\` for available commands`)
		} else return chorus;
	})
		.setAliases(['c'])
		.setDescription('Queries https://chorus.fightthe.pw for Guitar Hero charts')
		.setUsage(`[${Object.keys(chorus).filter(key => key !== 'help').join(' | ')}]`),
	osu: new Command(async (msg, option) => {
		if (option) {
			if (option in osu) {
				osu[option].command(msg);
				return;
			}
			for (let key in osu)
				if (osu[key + ''].aliases && option in osu[key + ''].aliases) {
					osu[key + ''].command(msg);
					return;
				}
			msg.channel.send(`Invalid input received. Use \`${msg.content.charAt(0)}osu help\` for available commands`)
		} else return osu;
	})
		.setAliases(['o'])
		.setDescription('Retrieves data from https://osu.ppy.sh/')
		.setUsage(`[${Object.keys(osu).filter(key => key !== 'help').join(' | ')}]`),
	add: new Command(msg => {
		let split = msg.content.split(/[\n ]+/msg);
		switch (split.length) {
			case 1:
				msg.reply(`No name specified! Usage: ${msg.content.charAt(0)}add [name] [content]`);
				return;
			case 2:
				if (msg.attachments.size === 0 && msg.embeds.length === 0){
					msg.reply(`No content added for command! Usage: ${msg.content.charAt(0)}add [name] [content]`);
					return;
				}
				break;
		}
		nconf.file(`./guilds/${msg.guild.id}/customCommands.json`);
		nconf.load();
		if (getCmd(split[1]) || nconf.get(split[1]) !== undefined) msg.reply('That command already exists!');
		else {
			let temp = msg.content.substring(msg.content.indexOf((split[1])) + 1 + split[1].length);
			let attachArr = [];
			if (msg.attachments.array().length > 0) {
				for (let i = 0; i < msg.attachments.array().length; i++) {
					attachArr.push(msg.attachments.array()[i].proxyURL)
				}
			}
			if (msg.embeds.length > 0) {
				for (let i = 0; i < msg.embeds.length; i++) {
					console.log(msg.embeds[i]);
					let type = msg.embeds[i].type;
					if (temp.includes(msg.embeds[i].url)) {
						//console.log('TRUE AND TRUE');
						temp = temp.replace(msg.embeds[i].url, '');
					}
					if (type === 'video'){
						attachArr.push(msg.embeds[i].url)
					} else if (type === 'image') {
						attachArr.push(msg.embeds[i].thumbnail.url)
					}
				}
			}
			nconf.set(split[1].toLowerCase() + ':message', temp);
			nconf.set(split[1].toLowerCase() + ':attachments', attachArr);
			nconf.set(split[1].toLowerCase() + ':author', msg.member.id);
			nconf.save(err => {
				if (err) {
					console.log(err);
					msg.reply("an error has occurred while adding your command!")
				} else {
					console.log(`Successful addition of ${msg.content.charAt(0) + split[1]}`);
					msg.reply(`your command \`${split[1]}\` has been successfully added`);
					//maybe add rich embed to output to #audit when command has been added
				}
			});
		}
		nconf.remove();
	})
		.setAliases(['a'])
		.setDescription('Adds a custom command')
		.setUsage('<content>'),
	delete: new Command(msg => {
		if (!msg.member.hasPermission('MANAGE_MESSAGES')) {
			msg.reply("You do not have permission to use that command.");
			return;
		}
		let split = msg.content.toLowerCase().split(/[\n ]+/msg);
		if (split.length === 1) {
			msg.reply('No command specified! Usage: $delete [command]');
			return;
		}
		if (getCmd(split[1])) {
			msg.reply('Cannot delete bot command/alias!')
		}
		nconf.file(`./guilds/${msg.guild.id}/customCommands.json`);
		nconf.load();
		nconf.set(split[1], undefined);
		nconf.save(err => {
			if (err) {
				console.log(err);
				msg.reply('an error has occurred while deleting that command!');
			} else {
				msg.reply(`the command ${msg.content.charAt(0) + split[1]} has been successfully deleted.`);
				//maybe add rich embed to output to #audit when command has been deleted
			}
		});
		nconf.remove();
	})
		.setAliases(['d', 'del'])
		.setDescription('Deletes a custom command')
		.setUsage('<Custom Command>'),
	bulkdelete: new Command(msg => {
		//permission check subject to change, present in other commands too
		if (!msg.member.hasPermission('MANAGE_MESSAGES')) {
			msg.reply("You do not have permission to use that command.");
			return;
		}
		let split = msg.content.toLowerCase().split(/[\n ]+/msg);
		if (split.length === 1) {
			msg.reply('Number of messages to delete not specified! Usage: !bulkdelete <number>');
		} else if (split[1].replace(/^[0-9]+$/, '') === ''){
			let num = parseInt(split[1]) + 1;
			let j = Math.min(num+1, 100);
			msg.channel.bulkDelete(j, false).then(deletedMessages => {
				let delMsgArr = deletedMessages.array();
				for (let i = 0; i < j; i++){
					//console.log(delMsgArr[i]);
					if (!(delMsgArr[i].author.bot || msg.id === delMsgArr[i].id)) {
						bot.logDelMsg(delMsgArr[i]);
					}
				}
			});
			msg.channel.send(`Successfully deleted ${j} messages!`);
		}
	})
		.setAliases(['bd'])
		.setDescription('Bulk deletes messages (up to 99)')
		.setUsage('<number>'),
	help: new Command(msg => {
		let embed = new RichEmbed().setTitle(`${msg.content.charAt(0)}help`)
			.setColor('#2299BB')
			.setThumbnail('https://img.icons8.com/bubbles/2x/bass-clef.png')
			.setFooter('Clef Bot');
		for (let key in module.exports) {
			if (key === 'help' || key === 'enable') continue;
			embed.addField('**' + key + '**', '> ' + module.exports[key + ''].description +
				`\n> \`${msg.content.charAt(0) + key}` +
				(module.exports[key + ''].usage ? ' ' + module.exports[key + ''].usage : '') + '`', false)
		}
		msg.channel.send(embed)
	})
		.setAliases(['h']),
	enable: new Command(msg => {
		//in progress
	})
		.setUsage(['e','en'])
		.setDescription('Enables ')
};

//taken from command handler
function getCmd(string) {
	if (string in module.exports) return module.exports[string];
	else for (let key in module.exports)
		if (module.exports[key + ''].aliases)
			if (string in module.exports[key + ''].aliases) {
				return module.exports[key + ''];
			}
}
