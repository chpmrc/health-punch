# sockets: cd holepunch-tunnel && nodemon --exec 'pear run --dev ./host/index.js' ./host/index.js
# init: rm -f /tmp/healthpunch*.sock
# hp-next-server: cd holepunch-tunnel && nodemon --exec 'pear run --dev ./next-server.js cf1f388571f287cf11770799265a9a056437f454a7240a45eabb367a793c1707 538fd70c38bdeA5ba72b804bc7169a58e73b70b22dcb108e61ff43bd7b26d34c /tmp/healthpunch-server2swarm' ./next-server.js
# hp-next-client: cd holepunch-tunnel && nodemon --exec 'pear run --dev ./next-server.js f598d0120edb980800f1d3bf6e569180744a31c09944839ec300f3c54d352195 138fd70c38bdeA5ba72b804bc7169a58e73b70b22dcb108e61ff43bd7b26d34c /tmp/healthpunch-client2swarm' ./next-client.js
client: cd app && sleep 5 && npm run dev
server: cd app && sleep 5 && npx tsx watch server-server.ts
next-server: rm -f /tmp/healthpunch-server2swarm && cd holepunch-tunnel && pear run --dev ./swarm.js f378fc1f3632059271fe0a3b61bd3276a42cbbf448c52de55852fac43d5ae0f8 /tmp/healthpunch-server2swarm
next-client: rm -f /tmp/healthpunch-client2swarm && cd holepunch-tunnel && pear run --dev ./swarm.js f378fc1f3632059271fe0a3b61bd3276a42cbbf448c52de55852fac43d5ae0f8 /tmp/healthpunch-client2swarm