const Discord = require('discord.js');
const rp = require('request-promise-native');
const Command = require('./structures/Command');

const roleIcons = {
	tank: {
		emote: '<:Tank:664245809365123122>',
		id: '664245809365123122'
	},
	damage: {
		emote: '<:DPS:664239441547886592>',
		id: '664239441547886592'
	},
	support: {
		emote: '<:Support:664245456238542848>',
		id: '664245456238542848'
	}
};

const rankIcons = [
	'<:Bronze:664262174650138654>',
	'<:Silver:664263204813275148>',
	'<:Gold:664263515053228075>',
	'<:Platinum:664263764169981992>',
	'<:Diamond:664263974912524296>',
	'<:Master:664264618675535910>',
	'<:Grandmaster:664264990441734164>'
];

const data = {
	platforms: ['pc', 'xbox', 'psn'],
	regions: ['us', 'eu', 'asia'],
};

module.exports = {
	stats: new Command(msg => {
		let {platform, region, user} = parseCommand(msg.content);
		if (!user) return msg.channel.send('No username input!');
		rp({
			uri: `https://ow-api.com/v1/stats/${platform}/${region}/${user}/profile`,
			json: true,
			resolveWithFullResponse: true
		}).then(res => {
			let {competitiveStats: {games}, private, name, icon, ratings, prestige, level, rating, endorsement} = res.body;
			if (private) {
				msg.channel.send(`Player's profile is private!`);
				return;
			}
			if (rating === 0) {
				msg.channel.send('Player has not placed this season!');
				return
			}
			let richEmbed = new Discord.RichEmbed()
				.setAuthor(`This Season's Competitive Stats`)
				.setTitle(rankIcons[getRank(rating)] + ' ' + (platform === 'pc' ? name : user) + (platform !== 'pc' ? ` *${platform.toUpperCase()}*` : ''))
				.setTimestamp()
				.setThumbnail(icon)
				.setFooter('Clef Bot', 'https://img.icons8.com/bubbles/2x/bass-clef.png')
				.setColor('FA9C1D');
			let description = `Level: ${prestige * 100 + level}` +
				`\nEndorsement level: ${endorsement}` +
				`\nTotal games played: ${games.played}` +
				`\nTotal games won: ${games.won}` +
				`\nCurrent SR Average: ${rankIcons[getRank(rating)] + rating}`;
			if (ratings) {
				let ratingsNoDup = ratings.filter((item, index) => {
					return ratings.indexOf(item) === index
				});
				for (let role of ratingsNoDup) {
					description += `\n${roleIcons[role.role].emote} ${role.role.replace(/^\w/, c => c.toUpperCase())}` +
						` SR: ${rankIcons[getRank(role.level)]} ${role.level}`;
				}
			}
			msg.channel.send(richEmbed.setDescription(description));
		}).catch(error => {
			console.log(error.statusCode);
			console.log(error);
			if (error.statusCode === 404 || error.statusCode === 400) {
				msg.channel.send('Player does not exist!');
			}
		});
	})
		.setAliases(['s'])
		.setDescription('Displays Competitive Stats for user.')
		.setUsage('stats [battletag | username]`\n> **Flags**: `-[platform]` `-[region]'),
	help: new Command(msg => {
		let embed = new Discord.RichEmbed().setTitle(`${msg.content.charAt(0)}ow help`)
			.setColor('#2299BB')
			.setThumbnail('https://img.icons8.com/bubbles/2x/bass-clef.png')
			.setFooter('Clef Bot');
		for (let key in module.exports) {
			if (key === 'help') continue;
			embed.addField('**' + key + '**', '> ' + module.exports[key + ''].description +
				`\n> \`${msg.content.charAt(0)}ow` +
				(module.exports[key + ''].usage ? ' ' + module.exports[key + ''].usage : '') + '`', false)
		}
		msg.channel.send(embed)
	})
		.setAliases(['h'])
};

function getRank(rating) {
	let rank = (rating - rating % 500) / 500;
	if (rank >= 0 && rank <= 2) rank = 0;
	else if (rating > 4000) rank = 6;
	else rank -= 2;
	return rank;
}

function parseCommand(s) {
	let t = s.matchAll(/\s-([a-z0-9]+)(?=\s|$)/ig);
	let u = s.match(/(?<=\s)(?:[^-])[\w\d-]+(#[0-9]+|)(?=\s|$)/g);
	let user, region, platform;
	for (let key of t) {
		if (!platform && data.platforms.indexOf(key[1].toLowerCase()) !== -1) {
			platform = key[1].toLowerCase();
			s = s.replace(key[0], '');
		} else if (!region && data.regions.indexOf(key[1].toLowerCase()) !== -1) {
			region = key[1].toLowerCase();
			s = s.replace(key[0], '');
		}
	}
	if (!platform || platform === 'pc') user = u ? u[0].trim().slice(0, u[0].lastIndexOf('#')) + '-' + u[0].trim().slice(u[0].lastIndexOf('#') + 1) : undefined;
	else user = u ? u[0].trim() : undefined;
	return {
		user: user,
		region: region ? region : 'us',
		platform: platform ? platform : 'pc'
	}
}
