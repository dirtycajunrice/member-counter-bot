import Command from "../typings/Command";
import embedBase from "../utils/embedBase";
import UserService from "../services/UserService";
import Eris from "eris";
import getEnv from "../utils/getEnv";
import { UserBadges } from "../utils/Constants";
import ReactionManager from "../utils/ReactionManager";
const { BOT_OWNERS } = getEnv();
import { MessageCollector } from "eris-collector";
import UserError from "../utils/UserError";
const emojiBadges = {
	[UserBadges.DONOR]: "❤️",
	[UserBadges.PREMIUM]: "💎",
	[UserBadges.BETA_TESTER]: "🧪",
	[UserBadges.TRANSLATOR]: "🌎",
	[UserBadges.CONTRIBUTOR]: "💻",
	[UserBadges.BIG_BRAIN]: "🧠",
	[UserBadges.BUG_CATCHER]: "🐛",
	[UserBadges.PATPAT]: "🐱",
	[UserBadges.FOLDING_AT_HOME]: "🧬"
};

const generateBadgeList = (badges: number): string => {
	const hasBadge = (badgeN: number): boolean => (badges & badgeN) === badgeN;

	const badgeList = [];

	for (const [badge, emoji] of Object.entries(emojiBadges)) {
		const badgeInt = Number(badge);
		if (hasBadge(badgeInt)) badgeList.push(emoji);
	}

	badgeList.map((item, i) => {
		if (i % 2 === 0) return item + " ";
	});

	return "``` " + badgeList.join(" ") + " ```";
};

const user: Command = {
	aliases: ["me", "profile", "user"],
	denyDm: false,
	run: async ({ message, languagePack, client }) => {
		const { author, channel, mentions, content } = message;
		const [
			_command,
			userRequested,
			actionRequested,
			...actionParams
		] = content.split(/\s+/);

		let targetUser: Eris.User =
			mentions[0] ||
			client.users.get(userRequested) ||
			(userRequested &&
				(await client.getRESTUser(userRequested).catch(console.error))) ||
			author;

		if (!(await UserService.exists(targetUser.id)))
			throw new UserError(languagePack.commands.profile.userNotFound);
		const userSettings = await UserService.init(targetUser.id);

		if (actionRequested && BOT_OWNERS.includes(author.id)) {
			switch (actionRequested.toLowerCase()) {
				case "grantcredit":
				case "grantcredits": {
					await userSettings.grantCredits(parseInt(actionParams[0], 10) || 1);
					break;
				}

				case "grantserverupgrade":
				case "grantserverupgrades": {
					await userSettings.grantAvailableServerUpgrades(
						parseInt(actionParams[0], 10) || 1
					);
					break;
				}

				case "grantbadge":
				case "grantbadges": {
					await userSettings.grantBadge(parseInt(actionParams[0], 2));
					await message.addReaction("✅");
					break;
				}

				case "revokebadge":
				case "revokebadges": {
					await userSettings.revokeBadge(parseInt(actionParams[0], 2));
					await message.addReaction("✅");
					break;
				}

				default: {
					await message.addReaction("❓");
					break;
				}
			}
		}

		const { badges, availableServerUpgrades, credits } = userSettings;

		const embed = embedBase({
			author: {
				icon_url: targetUser.dynamicAvatarURL(),
				name: `${targetUser.username}#${targetUser.discriminator}`
			},
			fields: []
		});

		embed.fields.push({
			name: languagePack.commands.profile.badges,
			value: generateBadgeList(badges),
			inline: true
		});

		embed.fields.push({
			name: languagePack.commands.profile.serverUpgradesAvailable,
			value: availableServerUpgrades.toString(10),
			inline: true
		});

		embed.fields.push({
			name: languagePack.commands.profile.credits,
			value: credits.toString(10),
			inline: true
		});

		const userProfileMessage = await channel.createMessage({ embeds: [embed] });

		if (targetUser.id === author.id) {
			await userProfileMessage.addReaction("🗑️");

			const { cancelText } = languagePack.commands.profile;

			ReactionManager.addReactionListener({
				message: userProfileMessage,
				emoji: "🗑️",
				callback: async (reactorId, destroyListener) => {
					if (author.id === reactorId) {
						destroyListener();
						const profileLP = languagePack.commands.profile;
						const confirmationPrompt = await channel.createMessage(
							profileLP.removeDataConfirmation
								.replace(
									"{CONFIRMATION_STRING}",
									profileLP.removeDataConfirmationString
								)
								.replace("{CANCEL_STRING}", profileLP.cancelText)
						);
						const filter = (m) =>
							(["cancel", cancelText].includes(m.content) &&
								reactorId === author.id) ||
							reactorId === author.id;
						const collector = new MessageCollector(client, channel, filter, {
							time: 60000,
							max: 1
						});
						collector.on("collect", async (m) => {
							if (m.content === profileLP.removeDataConfirmationString) {
								await userSettings.remove();
								confirmationPrompt.delete();
								await channel.createMessage(profileLP.removeDataSuccess);
							}
							if (["cancel", cancelText].includes(m.content)) {
								collector.stop();
								confirmationPrompt.delete();
							}
						});
						collector.on("end", () => {
							confirmationPrompt.delete();
						});
					}
				}
			});
		}
	}
};

const userCommands = [user];

export default userCommands;
