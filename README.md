# rbx completed trade notifier

### setup guide
- install nodejs from https://nodejs.org/en/download
- run `npm i` to install dependencies
- edit the `config.json` file
- start with `npm start`

### config format
each entry under `Pings and stuff` has 3 parts separated by a space:
```json
"Id Mention WebhookUrl"
```
if you wanted to watch the completeds for ROBLOX (ID 1), mention `@everyone`, and use the webhook URL "https://discord.com/a" then you would put the following line:
```json
"1 @everyone https://discord.com/a"
```
