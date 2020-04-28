module.exports = class Command {
	constructor(cmd) {
		this.command = cmd;
		return this;
	}
	setDescription(desc){
		this.description = desc;
		return this;
	}
	setAliases(aliasArr){
		this.aliases = {};
		for (const key of aliasArr){
			this.aliases[key] = this;
		}
		return this;
	}
	setUsage(msg){
		this.usage = msg;
		return this;
	}
};