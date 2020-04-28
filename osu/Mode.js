module.exports = class Mode {
	constructor(name, num, accFunction) {
		this.name = 'osu!' + name;
		this.num = num;
		this.acc = accFunction;
	}
	setAliases(aliasArr){
		this.aliases = {};
		for (const key of aliasArr){
			this.aliases[key] = this;
		}
		return this;
	}
};