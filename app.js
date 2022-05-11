const superagent = require('superagent');
const {
    ['Pings and stuff']: userIds,
    ['Privacy Mode']: privacy
} = require('./config.json');

let itemDetails = {};
let inventoryCache = {};

const refreshItemDetails = () => new Promise(resolve => {
    superagent('GET', 'https://ollie.fund/api/itemdetails')
        .then(resp => {
            itemDetails = resp.body || itemDetails;
            resolve();
        })
        .catch(() => {
            console.log('failed to fetch details from ollie.fund');
            resolve();
        })
});
const getInventory = async (userId, cursor = '', data = []) => new Promise(resolve => {
    const newData = data || [];
    let url = `https://inventory.roblox.com/v1/users/${userId}/assets/collectibles?limit=100`;
    if (cursor) url += `&cursor=${cursor}`

    superagent('GET', url)
        .then(async resp => {
            if (!resp.body || resp.body.errors) return resolve(null)

            const {
                nextPageCursor,
                data: inventory
            } = resp.body;

            for (const item of inventory)
                newData.push(`${item.assetId}:${item.userAssetId}`);

            if (nextPageCursor)
                return resolve(await getInventory(userId, nextPageCursor, newData));
            resolve(newData);
        })
        .catch(err => {
            if (!err || !err.response) return resolve(null);
            console.log(err.response.body || err.response)

            resolve();
        })
});
const getUsername = async userId => new Promise(resolve => {
    superagent('GET', `https://users.roblox.com/v1/users/${userId}`)
        .then(resp => {
            resolve(resp.body.name);
        })
        .catch(() => {
            resolve();
        })
})

const main = async () => {
    await refreshItemDetails();
    setInterval(refreshItemDetails, 5 * 60 * 1000 /* 5 minutes */)

    for (const userIdAndDiscord of userIds) {
        (async () => {
            const split = userIdAndDiscord.split(' ');
            const userId = split[0];
            const messageContent = split[1];
            const webhookUrl = split[2];

            const username = await getUsername(userId);
            if (!username) return console.log(`i don't think "${userId}" exists`)

            console.log('starting thread for', username);

            for (;;) {
                await new Promise(resolve => setTimeout(resolve, 1000 /* 1 second */));

                const currentInventory = await getInventory(userId);
                if (!currentInventory) continue;

                if (!inventoryCache[userId]) {
                    inventoryCache[userId] = currentInventory;
                    continue;
                }

                const sent = inventoryCache[userId].filter(e => !currentInventory.includes(e));
                const received = currentInventory.filter(e => !inventoryCache[userId].includes(e));
                inventoryCache[userId] = currentInventory;

                if (sent.length < 1 || received.length < 1) continue;

                let formattedItemsSent = [];
                let formattedItemsReceived = [];

                let totalValueSent = 0;
                let totalRapSent = 0;
                let totalValueReceived = 0;
                let totalRapReceived = 0;

                for (const item of sent) {
                    const itemId = item.split(':')[0];
                    const itemInfo = itemDetails[itemId];

                    const rap = itemInfo.rap || 0;
                    const value = itemInfo.value || rap;
                    const name = itemInfo.name;

                    totalValueSent += value;
                    totalRapSent += rap;

                    formattedItemsSent.push(
                        `\`${value.toLocaleString()}\` • [${name}](https://rolimons.com/item/${itemId})`
                    )
                }
                for (const item of received) {
                    const itemId = item.split(':')[0];
                    const itemInfo = itemDetails[itemId];

                    const rap = itemInfo.rap || 0;
                    const value = itemInfo.value || rap;
                    const name = itemInfo.name;

                    totalValueReceived += value;
                    totalRapReceived += rap;

                    formattedItemsReceived.push(
                        `\`${value.toLocaleString()}\` • [${name}](https://rolimons.com/item/${itemId})`
                    )
                }

                let valueGain = Math.round((totalValueReceived - totalValueSent) / totalValueSent * 10000) / 100;
                let rapGain = Math.round((totalRapReceived - totalRapSent) / totalRapSent * 10000) / 100;

                let embedTitle = !privacy ?
                    `:smirk_cat: new completed on ${username} !!` :
                    `:smirk_cat: new completed !!!`

                console.log(`[${username}] ${valueGain}% gain completed found !!`)

                let webhookBody = {
                    content: `${messageContent}`,
                    embeds: [
                        {
                            title: embedTitle,
                            description:
                                `<:rollahmons:973409500499431424> \`${(totalValueReceived - totalValueSent).toLocaleString()}\` \`//\` \`${valueGain}%\` value\n` +
                                `<:wrapping:973409500507811840> \`${(totalRapReceived - totalRapSent).toLocaleString()}\` \`//\` \`${rapGain}%\` rap`,
                            color: 9263359,
                            fields: [
                                {
                                    name: '📤 sent',
                                    value:
                                        `<:rollahmons:973409500499431424> \`${totalValueSent.toLocaleString()}\` \`//\` <:wrapping:973409500507811840> \`${totalRapSent.toLocaleString()}\` \n\n` +
                                        `${formattedItemsSent.join('\n')}`,
                                    inline: true
                                },
                                {
                                    name: '📥 received',
                                    value:
                                        `<:rollahmons:973409500499431424> \`${totalValueReceived.toLocaleString()}\` \`//\` <:wrapping:973409500507811840> \`${totalRapReceived.toLocaleString()}\` \n\n` +
                                        `${formattedItemsReceived.join('\n')}`,
                                    inline: true
                                }
                            ]
                        }
                    ]
                };

                superagent('POST', webhookUrl)
                    .set('content-type', 'application/json')
                    .send(webhookBody)
                    .then(() => {
                        console.log('sent webhook message');
                    })
                    .catch(err => {
                        console.log(err);
                    })
            }
        })().catch();
    }
}

main();
