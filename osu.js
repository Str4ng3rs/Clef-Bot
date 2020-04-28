const rp = require('request-promise-native');
const Discord = require('discord.js');
const {osuToken} = require('./auth.json');
const Command = require('./structures/Command');
const Mode = require('./osu/Mode');
const countries = require("i18n-iso-countries");
const moment = require('moment');
const {createCanvas, registerFont, loadImage} = require('canvas');
registerFont('fonts/Exo2-Regular.ttf', {family: 'Exo2'});

const Mods = {
	None: 0,
	NoFail: 1,
	Easy: 2,
	TouchDevice: 4,
	Hidden: 8,
	HardRock: 16,
	SuddenDeath: 32,
	DoubleTime: 64,
	Relax: 128,
	HalfTime: 256,
	Nightcore: 512, // Only set along with DoubleTime. i.e: NC only gives 576
	Flashlight: 1024,
	Autoplay: 2048,
	SpunOut: 4096,
	Relax2: 8192,    // Autopilot
	Perfect: 16384, // Only set along with SuddenDeath. i.e: PF only gives 16416
	Key4: 32768,
	Key5: 65536,
	Key6: 131072,
	Key7: 262144,
	Key8: 524288,
	FadeIn: 1048576,
	Random: 2097152,
	Cinema: 4194304,
	Target: 8388608,
	Key9: 16777216,
	KeyCoop: 33554432,
	Key1: 67108864,
	Key3: 134217728,
	Key2: 268435456,
	ScoreV2: 536870912,
	Mirror: 1073741824/*,
	KeyMod: Key1 | Key2 | Key3 | Key4 | Key5 | Key6 | Key7 | Key8 | Key9 | KeyCoop,
	FreeModAllowed: NoFail | Easy | Hidden | HardRock | SuddenDeath | Flashlight | FadeIn | Relax | Relax2 | SpunOut | KeyMod,
	ScoreIncreaseMods: Hidden | HardRock | DoubleTime | Flashlight | FadeIn*/
};

const modes = {
	0: new Mode('standard', 0, (count0, count50, count100, count300) => {
		let n0 = parseInt(count0);
		let n50 = parseInt(count50);
		let n100 = parseInt(count100);
		let n300 = parseInt(count300);
		return (((n50 * .5) + (n100) + (n300 * 3)) /
			(3 * (n0 + n50 + n100 + n300))) * 100
	})
		.setAliases(['osu', 'o']),
	1: new Mode('taiko', 1, (count0, count50, count100, count300) => {
		let n0 = parseInt(count0);
		let n50 = parseInt(count50);
		let n100 = parseInt(count100);
		let n300 = parseInt(count300);
		return (((n100 * .5) + (n300)) * 3 /
			(3 * (n0 + n50 + n100 + n300))) * 100
	})
		.setAliases(['taiko', 't']),
	2: new Mode('catch', 2, (countFruitMiss, countDroplet, countDrop, countFruit, countDropletMiss) => {
		let dropletMiss = parseInt(countDropletMiss);
		let droplet = parseInt(countDroplet);
		let drop = parseInt(countDrop);
		let fruitMiss = parseInt(countFruitMiss);
		let fruit = parseInt(countFruit);
		return ((fruit + drop + droplet) / (fruit + fruitMiss + drop + droplet + dropletMiss)) * 100
	})
		.setAliases(['catch', 'c']),
	3: new Mode('mania', 3, (count0, count50, count100, count300, count200, countMAX) => {
		let n0 = parseInt(count0);
		let n50 = parseInt(count50);
		let n100 = parseInt(count100);
		let n200 = parseInt(count200);
		let n300 = parseInt(count300);
		let nMAX = parseInt(countMAX);
		return (((n50 * .5) + (n100) + (n200 * 2) + ((n300 + nMAX) * 3)) /
			(3 * (n0 + n50 + n100 + n200 + n300 + nMAX))) * 100
	})
		.setAliases(['mania', 'm'])
};

const ranks = {
	XH: '<:rankXH:671398266956414986>',
	X: '<:rankX:671398267526971392>',
	SH: '<:rankSH:671398266805551122>',
	S: '<:rankS:671398266965065748>',
	A: '<:rankA:671398266549567543>',
	B: '<:rankB:671398266939768912>',
	C: '<:rankC:671398267220918282>',
	D: '<:rankD:671398266968997888>'
};

module.exports = {
	stats: new Command(async msg => {
		msg.channel.startTyping();
		let {username, mode} = parseUserAndMode(msg.content);
		let user = await getUserStats(username ? username : msg.author.username, mode);
		//console.log(user);
		if (!user) {
			msg.channel.stopTyping();
			msg.channel.send('Invalid username');
			return;
		}
		let canvas = createCanvas(90, 100);
		let ctx = canvas.getContext('2d');
		ctx.quality = "best";
		ctx.antialias = "subpixel";
		ctx.drawImage(await loadImage('osu/level-hexagon.png'), 0, 0, 88.6, 100);
		ctx.font = '48px exo2';
		ctx.fillStyle = '#ffffff';
		ctx.textAlign = "center";
		ctx.fillText(`${user.level ? user.level - (user.level % 1) : 1}`, 44.3, 66);
		
		let seconds = user.timePlayed;
		let days = Math.floor(seconds / (3600 * 24));
		seconds -= days * 3600 * 24;
		let hrs = Math.floor(seconds / 3600);
		seconds -= hrs * 3600;
		let minutes = Math.floor(seconds / 60);
		let description = `\`\`\`Ranked Score  ${insertCommas(user.rankedScore).padStart(20)}\n` +
			`Hit Accuracy ${((user.acc - (user.acc % 0.01))).toFixed(2).padStart(20)}%\n` +
			`Play Count    ${insertCommas(user.playCount).padStart(20)}\n` +
			`Total Score   ${insertCommas(user.totalScore).padStart(20)}\n` +
			`Total Hits    ${insertCommas(user.totalHits).padStart(20)}\`\`\`\n`;
		let embed = new Discord.RichEmbed()
			.setColor('#ff66aa')
			.setDescription(description)
			.setThumbnail(`https://a.ppy.sh/${user.userID}`)
			.setFooter(countries.getName(user.country, 'en') + ' | Joined',
				`https://osu.ppy.sh/images/flags/${user.country}.png`)
			.setTimestamp(user.joinedAt)
			.attachFile(new Discord.Attachment(canvas.toBuffer('image/png', {
				compressionLevel: 0,
				filters: canvas.PNG_FILTER_NONE,
				resolution: 420
			}), `level.png`))
			.setAuthor(user.username + "'s Profile",
				'attachment://level.png',
				`https://osu.ppy.sh/users/${user.userID}`)
			.setTitle(modes[mode].name + ' Stats')
			.addField('Total Play Time',
				(days ? `${days}d ` : '') + (hrs ? `${Math.floor(hrs)}h ` : '') + (minutes + 'm') +
				(user.hoursPlayed ? `\n(${user.hoursPlayed} hours)` : ''),
				true)
			.addField('pp',
				insertCommas(user.rawPP),
				true)
			.addField('Ranking',
				`Global: #${insertCommas(user.globalRank)}\nCountry: #${insertCommas(user.countryRank)}`,
				true);
		msg.channel.send({embed: embed}).then(() => msg.channel.stopTyping());
	})
		.setAliases(['s'])
		.setDescription('Retrieves stats for specified player.')
		.setUsage('stats [username] -[gamemode]'),
	top: new Command(async msg => {
		msg.channel.startTyping();
		let {username, mode} = parseUserAndMode(msg.content);
		let user = await getUserStats(username ? username : msg.author.username, mode);
		if (!user) {
			msg.channel.stopTyping();
			msg.channel.send('Invalid username');
			return;
		}
		let scores = await getUserTop(username ? username : msg.author.username, mode, 5, 0);
		if (scores.length === 0) {
			msg.channel.send(`User has not played ${modes[mode].name}!`);
			msg.channel.stopTyping();
			return;
		}
		let description = scores.join('\n');
		await msg.channel.send(new Discord.RichEmbed()
			.setColor('#2299bb')
			.setThumbnail(`https://a.ppy.sh/${user.userID}`)
			.setAuthor(user.username + "'s Profile",
				`https://osu.ppy.sh/images/flags/${user.country}.png`,
				`https://osu.ppy.sh/u/${user.userID}`)
			.setTitle(modes[mode].name + ' Top Scores')
			.setURL(`https://osu.ppy.sh/u/${user.userID}/${mode}`)
			.setDescription(description));
		msg.channel.stopTyping();
	})
		.setAliases(['t'])
		.setDescription('Retrieves top scores for osu player')
		.setUsage('top [username] -[gamemode]'),
	help: new Command(msg => {
		let embed = new Discord.RichEmbed().setTitle(`${msg.content.charAt(0)}osu help`)
			.setColor('#2299BB')
			.setThumbnail('https://img.icons8.com/bubbles/2x/bass-clef.png')
			.setFooter('Clef Bot');
		for (let key in module.exports) {
			if (key === 'help' || key === 'enable') continue;
			embed.addField('**' + key + '**', '> ' + module.exports[key + ''].description +
				`\n> \`${msg.content.charAt(0)}osu` +
				(module.exports[key + ''].usage ? ' ' + module.exports[key + ''].usage : '') + '`', false)
		}
		msg.channel.send(embed)
	})
		.setAliases(['h']),
	enable: (msg) => {
		msg.reply('pp');
	}
};



async function getBeatmap(beatmapID, mods, mode) {
	return await rp({
		uri: `https://osu.ppy.sh/api/get_beatmaps` +
			`?k=${osuToken}&b=${beatmapID}&mods=${mods ? getDiffChangeModsNum(mods) : 0}&a=1&m=${mode ? mode : 0}`,
		json: true
	}).then(res => {
		let beatmap = res[0];
		//console.log(beatmap);
		const {
			hit_length,
			total_length,
			difficultyrating,
			creator_id,
			version,
			diff_size,
			beatmapset_id,
			creator,
			beatmap_id,
			artist,
			mode: m,
			bpm,
			title,
			max_combo
		} = beatmap;
		return ({
			name: title,
			artist: artist,
			mapper: creator,
			mapperID: creator_id,
			diffName: version,
			mode: parseInt(m),
			keys: mode === 3 ? parseInt(m) === mode ? diff_size : getKeyNum(beatmap) : undefined,
			stars: parseFloat(difficultyrating).toFixed(2),
			bpm: parseInt(bpm),
			length: parseInt(total_length),
			effectiveLength: parseInt(hit_length),
			maxCombo: parseInt(max_combo),
			mapsetID: beatmapset_id,
			beatmapID: beatmap_id
		})
	});
}

async function getUserStats(userID, mode) {
	return await rp({
		uri: `https://osu.ppy.sh/api/get_user?k=${osuToken}&u=${userID}&m=${mode}`,
		json: true
	}).then(res => {
		if (!res[0]) {
			return undefined;
		}
		let {
			username, user_id, join_date, total_seconds_played: playTime,
			level, country, ranked_score, total_score, accuracy,
			playcount, pp_country_rank, pp_rank, pp_raw,
			count50, count100, count300
		} = res[0];
		return {
			username: username,
			userID: user_id,
			joinedAt: join_date,
			timePlayed: playTime,
			hoursPlayed: Math.round(playTime / 3600) > 0 ? Math.round(playTime / 3600) : undefined,
			level: level,
			country: country,
			rankedScore: ranked_score,
			totalScore: total_score,
			acc: accuracy,
			playCount: playcount,
			rawPP: pp_raw,
			globalRank: pp_rank,
			countryRank: pp_country_rank,
			totalHits: parseInt(count300) + parseInt(count100) + parseInt(count50)
		}
	})
}

/**
 * Returns a number of user's top scores for specified mode from specified index
 * @param userID - osu! user ID, can be string or number
 * @param mode - Mode (0 = osu!, 1 = Taiko, 2 = CtB, 3 = osu!mania). Optional, default value is 0.
 * @param num - How many scores to get. Default value is 5
 * @param from - From what index to get maps from
 */
async function getUserTop(userID, mode, num, from) {
	return await rp({
		uri: `https://osu.ppy.sh/api/get_user_best?k=${osuToken}&u=${userID}&limit=${(from ? from : 0) +
		(num ? num : 5)}&m=${mode ? mode : 0}`,
		json: true
	}).then(async scores => {
		let scoreArr = [];
		for (let i = from ? from : 0; i < Math.min(scores.length, num); i++) {
			const {
				pp: pp1, beatmap_id, enabled_mods, rank, maxcombo, count300, count100, countgeki,
				score, countmiss, count50, countkatu, date
			} = scores[i];
			let beatmap = await getBeatmap(beatmap_id, parseInt(enabled_mods), mode);
			let mods = modsSelected(parseInt(enabled_mods));
			let pp = parseFloat(pp1).toFixed(2);
			let acc = modes[mode].acc(countmiss, count50, count100, count300, countkatu, countgeki);
			let dateAchieved = moment(date, moment.ISO_8601).subtract(+5, 'hours').fromNow();
			scoreArr.push(`**${i + 1}. [${beatmap.name}](https://osu.ppy.sh/s/${beatmap.mapsetID})** ` +
				(beatmap.keys ? `[${beatmap.keys}K] ` : '') +
				`[[${beatmap.diffName}](https://osu.ppy.sh/b/${beatmap.beatmapID})] ${beatmap.stars}<:Star:670006896048209931>` +
				`\n${beatmap.artist} // ${beatmap.mapper}` +
				`\n> **Mods: ${mods.join(' ')}**` +
				`\n> ${ranks[rank]} • **${pp}pp** • **${acc.toFixed(2)}%**` +
				`\n> **Score:** ${insertCommas(parseInt(score))} • ` +
				`**x${maxcombo + (beatmap.maxCombo ? `/${beatmap.maxCombo}` : '')}**` +
				(countmiss !== '0' ? ` • **${countmiss}m**` : '') +
				`\n> ` + (dateAchieved.startsWith('a') ? 'About ' + dateAchieved : dateAchieved));
		}
		return Promise.all(scoreArr);
	});
}

/**
 * Calculates number of keys in converted map (because api doesnt do it...)
 * Takes in beatmap object, returns amount of keys as int value
 *
 * @param cSlid # of Slider objects
 * @param cSpin # of Spinner objects
 * @param cHit # of HitNormal objects
 * @param od OverallDifficulty
 * @param cs Circle Size
 * @return int keyNum Key Amount
 */
function getKeyNum({count_slider: cSlid, count_spinner: cSpin, count_normal: cHit, diff_overall: od, diff_size: cs}) {
	let roundedCS = Math.round(parseFloat(cs));
	let roundedOD = Math.round(parseFloat(od));
	//lazy
	let percentSlidOrSpin = (parseFloat(cSlid) + parseFloat(cSpin)) / (parseFloat(cSlid) + parseFloat(cSpin) + parseFloat(cHit));
	if (percentSlidOrSpin < 0.2) return 7;
	else if (percentSlidOrSpin < 0.3 || roundedCS >= 5) return roundedOD > 5 ? 7 : 6;
	else if (percentSlidOrSpin > 0.6) return roundedOD > 4 ? 5 : 4;
	else return Math.max(4, Math.min(roundedOD + 1, 7));
}

// returns array of emotes containing all the mods given a mods value
function modsSelected(enabledMods) {
	let selection = [];
	if (!enabledMods || (enabledMods === 0)) return ['<:NoMod:671120314599735311>'];
	if ((enabledMods & Mods.NoFail) === Mods.NoFail) selection.push('<:NF:671120295909654528> ');
	if ((enabledMods & Mods.Easy) === Mods.Easy) selection.push('<:EZ:671120087197024258>');
	if ((enabledMods & Mods.TouchDevice) === Mods.TouchDevice) selection.push('<:TD:671120576370442246>');
	if ((enabledMods & Mods.Hidden) === Mods.Hidden) selection.push('<:HD:671120234475946005>');
	if ((enabledMods & Mods.HardRock) === Mods.HardRock) selection.push('<:HR:671120212065517590>');
	if ((enabledMods & Mods.SuddenDeath) === Mods.SuddenDeath) selection.push('<:SD:671120545432993849>');
	if ((enabledMods & Mods.DoubleTime) === Mods.DoubleTime) selection.push('<:DT:671120067286663172>');
	if ((enabledMods & Mods.Relax) === Mods.Relax) selection.push('<:RX:671120506514178068>');
	if ((enabledMods & Mods.HalfTime) === Mods.HalfTime) selection.push('<:HT:671120192247431183>');
	if ((enabledMods & Mods.Nightcore) === Mods.Nightcore) {
		selection.splice(selection.indexOf('<:DT:671120067286663172>'), 1);
		selection.push('<:NC:671120280181145630>');
	}
	if ((enabledMods & Mods.Flashlight) === Mods.Flashlight) selection.push('<:FL:671120129421082673>');
	if ((enabledMods & Mods.Autoplay) === Mods.Autoplay) selection.push('<:Auto:671119970477932613>');
	if ((enabledMods & Mods.SpunOut) === Mods.SpunOut) selection.push('<:SO:671120520024162305>');
	if ((enabledMods & Mods.Relax2) === Mods.Relax2) selection.push('<:AP:671119997556228097>');
	if ((enabledMods & Mods.Perfect) === Mods.Perfect) {
		selection.splice(selection.indexOf('<:SD:671120545432993849>'), 1);
		selection.push('<:PF:671120418806956068>');
	}
	if ((enabledMods & Mods.Key4) === Mods.Key4) selection.push('<:4K:671119786469490689>');
	if ((enabledMods & Mods.Key5) === Mods.Key5) selection.push('<:5K:671119809060143133>');
	if ((enabledMods & Mods.Key6) === Mods.Key6) selection.push('<:6K:671119828265730066>');
	if ((enabledMods & Mods.Key7) === Mods.Key7) selection.push('<:7K:671119862419947550>');
	if ((enabledMods & Mods.Key8) === Mods.Key8) selection.push('<:8K:671119894183411712>');
	if ((enabledMods & Mods.FadeIn) === Mods.FadeIn) selection.push('<:FI:671120102145392660>');
	if ((enabledMods & Mods.Random) === Mods.Random) selection.push('<:Random:671120445030006805>');
	if ((enabledMods & Mods.Cinema) === Mods.Cinema) selection.push('<:Cinema:671120018141872129>');
	if ((enabledMods & Mods.Target) === Mods.Target) selection.push('<:TP:671120559144435763>');
	if ((enabledMods & Mods.Key9) === Mods.Key9) selection.push('<:9K:671119929566691349>');
	if ((enabledMods & Mods.KeyCoop) === Mods.KeyCoop) selection.push('<:Coop:671120039273037875>');
	if ((enabledMods & Mods.Key1) === Mods.Key1) selection.push('<:1K:671119410043551755>');
	if ((enabledMods & Mods.Key3) === Mods.Key3) selection.push('<:3K:671119438824603701>');
	if ((enabledMods & Mods.Key2) === Mods.Key2) selection.push('<:2K:671119428959731737>');
	if ((enabledMods & Mods.ScoreV2) === Mods.ScoreV2) selection.push('+ScoreV2');
	if ((enabledMods & Mods.Mirror) === Mods.Mirror) selection.push('<:Mirror:671120260857856001>');
	return selection;
}

// returns number containing mods that increase/decrease star rating
function getDiffChangeModsNum(enabledMods) {
	let mods = 0;
	if (!enabledMods || (enabledMods === 0)) return mods;
	if ((enabledMods & Mods.Easy) === Mods.Easy) mods += Mods.Easy;
	if ((enabledMods & Mods.HardRock) === Mods.HardRock) mods += Mods.HardRock;
	if ((enabledMods & Mods.DoubleTime) === Mods.DoubleTime) mods += Mods.DoubleTime;
	if ((enabledMods & Mods.HalfTime) === Mods.HalfTime) mods += Mods.HalfTime;
	if ((enabledMods & Mods.Key4) === Mods.Key4) mods += Mods.Key4;
	if ((enabledMods & Mods.Key5) === Mods.Key5) mods += Mods.Key5;
	if ((enabledMods & Mods.Key6) === Mods.Key6) mods += Mods.Key6;
	if ((enabledMods & Mods.Key7) === Mods.Key7) mods += Mods.Key7;
	if ((enabledMods & Mods.Key8) === Mods.Key8) mods += Mods.Key8;
	if ((enabledMods & Mods.Key9) === Mods.Key9) mods += Mods.Key9;
	if ((enabledMods & Mods.KeyCoop) === Mods.KeyCoop) mods += Mods.KeyCoop;
	if ((enabledMods & Mods.Key1) === Mods.Key1) mods += Mods.Key1;
	if ((enabledMods & Mods.Key3) === Mods.Key3) mods += Mods.Key3;
	if ((enabledMods & Mods.Key2) === Mods.Key2) mods += Mods.Key2;
	return mods;
}

// inserts commas (Ex. 1,234) to a number value
function insertCommas(number) {
	return number ? number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : '0';
}

// interprets mode given a string value (looks for aliases as well)
function getMode(mode) {
	if (mode in modes) return modes[mode].num;
	else for (let key in modes) if (mode in modes[key].aliases) return modes[key].num;
}

function parseUserAndMode(s){
	let t = s.matchAll(/\s-([a-z0-9]+)(?=\s|$)/ig);
	let mode;
	for (let key of t){
		if (getMode(key[1])) {
			mode = getMode(key[1]);
			s = s.replace(key[0], '');
			break;
		}
	}
	if (!mode) mode = 0;
	return {
		username: s.replace(s.split(/[\n ]+/msg).splice(0, 2).join(' '), '').trim(),
		mode: mode
	}
}