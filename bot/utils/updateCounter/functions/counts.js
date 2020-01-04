const getMembersRelatedCounts = (guild) => {
            let counts = {};
            //members related counts
            counts.members = guild.memberCount;
            counts.bots = 0;
            counts.users = 0;
            counts.onlineMembers = 0;
            counts.offlineMembers = 0;
            counts.onlineUsers = 0;
            counts.offlineUsers = 0;
            counts.onlineBots = 0;
            counts.offlineBots = 0;
    
            for (let i of guild.members.keys()) {
                const member = guild.members.get(i);
                
                const memberIsOffline = member.presence.status === "offline";
                const memberIsBot = member.user.bot;
    
                if (memberIsBot) counts.bots++;
    
                if (memberIsOffline) counts.offlineMembers++;
                else counts.onlineMembers++;
    
                if (memberIsOffline && memberIsBot) counts.offlineBots++;
                else if (memberIsOffline) counts.offlineUsers++;
    
                if (!memberIsOffline && memberIsBot) counts.onlineBots++;
                else if (!memberIsOffline) counts.onlineUsers++;
            }
                
        counts.users = counts.members - counts.bots;

        return counts;

}

const getChannels = (guild) => guild.channels.filter(channel => channel.type !== "category").size;

//*counts members and users
const getConnectedUsers = (guild) => {
    let count = new Map(); 
    guild.channels.forEach(channel => {
        if (channel.type === "voice")
            channel.members.forEach(member => count.set(member.id));
    });
    return count.size;
}

const getRoles = (guild) => guild.roles.size;

const generateBaseCounts = (guild) => {
    return {
        ...getMembersRelatedCounts(guild),
        channels: getChannels(guild),
        roles: getRoles(guild)
    };
}

module.exports = {
    generateBaseCounts,
    getMembersRelatedCounts,
    getChannels,
    getRoles,
    getConnectedUsers
}