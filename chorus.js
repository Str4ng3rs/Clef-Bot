const Discord = require('discord.js');
const rp = require('request-promise-native');
const Command = require('./structures/Command');
const {createCanvas, registerFont, loadImage} = require('canvas');
registerFont('fonts/Roboto-Regular.ttf', {family: 'Roboto'});

const chorusLogo = 'https://cdn.discordapp.com/attachments/662888794806288397/665016941353893901/logo.png';

module.exports = {
	latest: new Command(msg => {
		rp({
			uri:'https://chorus.fightthe.pw/api/latest',
			json: true,
		}).then(async ({songs})=> {
			let webhook = await webHookExists(msg);
			if (!webhook) return;
			let embedArr = [];
			for (let i = 0; i < 5; i++) {
				embedArr.push(await createEmbed(songs[i]));
			}
			webhook.send({embeds: embedArr});
		})
	}).setAliases(['l'])
		.setDescription('Grabs the 5 most recently uploaded charts')
		.setUsage('latest'),
	search: new Command(msg => {
		let command = msg.content;
		{
			let splits = command.split(/[\n ]+/msg);
			if (splits.length === 2) {
				msg.channel.send(`See \`${msg.content.charAt(0)}chorus search help\` for proper usage`);
				return;
			}
		}
		let queries = parseQueries(command);
		console.log(queries);
		rp({
			uri:'https://chorus.fightthe.pw/api/search?query=' + queries,
			json: true,
		}).then(async ({songs}) => {
			let webhook = await webHookExists(msg);
			if (!webhook) return;
			let songsArr = songs.slice(0, 5);
			let embedArr = songsArr.map(async song => {
				return await createEmbed(song)
			});
			webhook.send(`Your terms are: ${queries.toString().replace(',', ' ')}`,
				{embeds: await Promise.all(embedArr)});
		})
	})
		.setAliases(['s'])
		.setDescription(`Search Chorus using queries`)
		.setUsage('search [queries] ...'),
	enable: new Command(async msg => {
		if (!(await webHookExists(msg, true))) {
			msg.channel.createWebhook('Chorus', chorusLogo, 'Allows multiple embeds ' +
				`in the channel, enabled by: ${msg.client.user.tag}`).then(webHook => {
				msg.channel.send(`Successfully created ${webHook.name} webhook! ${webHook.token}`);
			});
		} else {
			msg.channel.send('Chorus webhook already enabled in this channel!')
		}
	})
		.setAliases(['e'])
		.setDescription('Enables webhook for channel command was sent in')
		.setUsage('enable'),
	instruments: new Command(msg => {
		msg.channel.send('Searchable instruments: ' +
			'`guitarghl`, `bassghl`, `guitar`, `bass`, `rhythm`, `drums`, `vocals`, `keys`, `band`')
	})
		.setAliases(['i'])
		.setDescription('Displays searchable instruments')
		.setUsage('instruments'),
	paramhelp : new Command(msg => {
		let prefix = msg.content.charAt(0);
		msg.channel.send(
			new Discord.RichEmbed()
			.setTitle('**Search Param Help**')
				.setDescription(`Usage: \`${prefix}chorus search ['<' | '>'][0-9][instrument][DIFF][<query>=""]\`` +
					`\nEx. 1: \`${prefix}chorus search >4guitarEMHX 3bassHX guitarghlX ...\`` +
					`\nEx. 2: \`${prefix}chorus search name="Andromeda" artist="Gorillaz" ...\``)
				.addField('<query>=""', "> <query> can be replaced by any of the following search tools:\n> `name`, `artist`, `album`, `genre`, `charter`")
				.addField('**<** or **>**', `> Sets the tier range to search within (inclusive), defaults to **>**`)
				.addField('[0-9]', '> Sets the tier to use in the search, defaults to **0**')
				.addField('instrument (__CASE SENSITIVE__)', `> Specifies what instrument to search for, use\n> \`${prefix}chorus instruments\` to list instruments`)
				.addField('DIFF (__CASE SENSITIVE__)', '> Specifies which difficulties to search, optional and can include any of the following:\n> `E`, `M`, `H`, `X`')
				.setColor('#2299BB')
				.setThumbnail('https://img.icons8.com/bubbles/2x/bass-clef.png')
				.setFooter('Clef Bot')
		)
	})
		.setAliases(['p'])
		.setDescription('Displays search parameter help')
		.setUsage('paramhelp'),
	help: new Command(msg => {
		let embed = new Discord.RichEmbed().setTitle(`${msg.content.charAt(0)}chorus help`)
			.setColor('#2299BB')
			.setThumbnail('https://img.icons8.com/bubbles/2x/bass-clef.png')
			.setFooter('Clef Bot');
		for (let key in module.exports) {
			if (key === 'help') continue;
			embed.addField('**' + key + '**', '> ' + module.exports[key + ''].description +
				`\n> \`${msg.content.charAt(0)}chorus` +
				(module.exports[key + ''].usage ? ' ' + module.exports[key + ''].usage : '') + '`', false)
		}
		msg.channel.send(embed)
	})
		.setAliases(['h'])
};

async function webHookExists(msg, check) {
	let client = await msg.client.fetchApplication().then(app => {
		return app.client
	});
	let webhook = await msg.channel.fetchWebhooks().then(hookArr => {
		for (let webHook of hookArr) {
			if (webHook[1].owner === client.user && webHook[1].name === 'Chorus') {
				return webHook[1]
			}
		}
	});
	if (webhook) {
		return webhook;
	} else if (!check) {
		msg.channel.send('Chorus webhook not enabled! Ask an admin to use ' + '' +
			`\`${msg.content.charAt(0)}chorus enable\` in this channel`)
	}
}

async function createEmbed(song) {
	const {directLinks, album, length, link, id, genre, sources, uploadedAt, effectiveLength, name, year, artist, charter, noteCounts} = song;
	let al = album ? album + ' ' : '';
	let yr = year ? `(${year})` : '';
	let genres = genre ? genre : 'Unknown album';

	let len = (Math.floor(length / 3600) > 0 ? Math.floor(length / 3600) + ':' : '') +
		`${Math.floor((length % 3600) / 60) + ':' + ('0' + length % 60).slice(-2)} `;

	let hitLength = '(' +
		(Math.floor(effectiveLength / 3600) > 0 ? Math.floor(effectiveLength / 3600) + ':' : '') +
		`${Math.floor(effectiveLength % 3600 / 60) + ':' + ('0' + effectiveLength % 60).slice(-2)})`;

	let src = '';
	let sourcesArr = sources;
	for (let j = 0; j < sourcesArr.length; j++) {
		const {parent, name: nm, link: lnk} = sourcesArr[j];
		if (parent) {
			src += `[${parent.name}](${parent.link}) in `;
		}
		src += `[${nm}](${lnk})`;
		if (j !== sourcesArr.length - 1) src += '\n';
	}
	//console.log(song.charter === null);
	// didn't just hit enter in template string since doesn't display properly on mobile
	// also, this is pretty much gibberish ¯\_(ツ)_/¯, sets all the details of the song ig
	let description = al + yr +
		`\n${genres}\n` +
		((length > 0 && effectiveLength) > 0 ? len + hitLength + '\n' : '') +
		(charter ? `Charter: ${charter}\n` : '') +
		(sources ? `Source: ${src}\n` : '');

	let thumbnail = directLinks['album.png'] ||
		directLinks['album.jpg'] || directLinks['album'];

	// commented out this code because doesn't display properly on mobile without max instrument count (7)
	// can enable if want pictures with no whitespace
	/*let instruments = Object.keys(song.noteCounts).length;
	if ('undefined' in song.noteCounts) instruments --;
	if ('vocals' in song.noteCounts) instruments --;*/
	let canvas = createCanvas(32 * 7, 64);
	let ctx = canvas.getContext('2d');
	ctx.quality = "best";
	ctx.antialias = "subpixel";
	let instrumentCount = 0;
	if (noteCounts) for (let key of Object.keys(noteCounts)) {
		if (key === 'undefined' || key === 'vocals') continue;
		let tier = song[`tier_${key}`] || '_';
		if (tier !== '_') tier = tier <= 6 ? tier : 6;
		ctx.drawImage(
			await loadImage(`./chorus/tiers/${tier}.png`),
			(32 * instrumentCount) + 4, 0, 24, 24
		);
		ctx.drawImage(
			await loadImage(`./chorus/instruments/${key}.png`),
			(32 * instrumentCount) + 4, 28, 24, 24
		);

		let difficulties = '';
		for (let key2 of ['e', 'm', 'h', 'x']) {
			difficulties += key2 in noteCounts[key] ? key2.toUpperCase() : '';
		}

		ctx.font = '11px roboto';
		ctx.fillStyle = '#ffffff';
		ctx.fillText(difficulties, (32 * instrumentCount) + (14.9 - difficulties.length * 3.7) + 0.7, 64);

		instrumentCount++;
	}

	let difficultiesImage = noteCounts ? new Discord.Attachment(canvas.toBuffer(), `${id}_diffs.png`) : '';

	return new Discord.RichEmbed()
		.setAuthor(artist)
		.setTitle(`${name}`)
		.setURL(link)
		.setDescription(description)
		.setColor('#D59A11')
		.setThumbnail(thumbnail)
		.attachFile(difficultiesImage)
		.setImage(`attachment://${id}_diffs.png`)
		.setFooter('Clef Bot', 'https://img.icons8.com/bubbles/2x/bass-clef.png')
		.setTimestamp(Date.parse(uploadedAt));
}

function parseQueries(command) {
	// used to extract the different word queries in the command first
	// for queries without quotes, only grabs one word
	let queries = [].concat(command.match(/(name="|artist="|album="|genre="|charter=")[\w ]+"/g)).concat(
		command.match(/(name=|artist=|album=|genre=|charter=)[\w]+/g)
	);
	for (let i = 0; i < queries.length; i++) {
		if (!queries[i]) continue;
		let s = queries[i].split('=');
		if (!s[1].startsWith('"')) queries[i] = `"${s[1]}"`;
	}
	let diffQueries = command.match(
		/(>|<|)([0-9]|)(guitarghl|bassghl|guitar|bass|rhythm|drums|vocals|keys|band)([EMHX]+|)/g
	);
	if (diffQueries) for (let i = 0; i < diffQueries.length; i++) {
		let instrument = diffQueries[i].match(/guitarghl|bassghl|guitar|bass|rhythm|drums|vocals|keys|band/);
		let range = diffQueries[i].match(/[><]/);
		let tier = diffQueries[i].match(/[0-9]/);
		let diffs = diffQueries[i].match(/[EMHX]/g);
		let diffNum = 0;
		if (diffs) {
			diffs = diffs.filter((item, index) => diffs.indexOf(item) === index);
			for (let key of diffs) {
				switch (key) {
					case 'E':
						diffNum += 1;
						break;
					case 'M':
						diffNum += 2;
						break;
					case 'H':
						diffNum += 4;
						break;
					case 'X':
						diffNum += 8;
						break;
				}
			}
		}
		range = range ? (range[0] === '>' ? 'gt' : 'lt') : 'gt';
		queries.push(tier ? `tier_${instrument[0]}=${range + tier[0]}` : null);
		queries.push(diffs ? `diff_${instrument[0]}=${diffNum}` : null);
		if (!tier && !diffs) queries.push(`tier_${instrument}=gt0`);
	}
	queries = queries.filter(value => {
		return value != null
	});
	let words = command.match(/([\w]+)/g);
	if (queries.length === 0){
		for (let i = 2; i < words.length;i++){
			queries.push(words[i]);
		}
	}
	console.log(queries);

	return queries.toString().replace(/,/g, ' ');
}