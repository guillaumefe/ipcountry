self.addEventListener('message', async (e) => {
    const { countryCode } = e.data;
    let ipData = [];
    const BATCH_SIZE = 20;

    function ipToNumber(ip) {
        return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
    }

    function numberToIp(num) {
        return [
            (num >>> 24) & 255,
            (num >>> 16) & 255,
            (num >>> 8) & 255,
            num & 255,
        ].join('.');
    }

    function generateIPsFromCIDR(cidr) {
        const [baseIp, bits] = cidr.split('/');
        const ipCount = Math.pow(2, 32 - parseInt(bits));
        const startIpNum = ipToNumber(baseIp);
        const ips = [];

        for (let i = 0; i < ipCount; i++) {
            ips.push(numberToIp(startIpNum + i));
        }

        return ips;
    }

    async function fetchRIPERanges() {
        const url = `https://stat.ripe.net/data/country-resource-list/data.json?resource=${countryCode}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('RIPE API failed');
        const data = await response.json();
        return data.data.resources.ipv4;
    }

    try {
        const ripeIPs = await fetchRIPERanges();
        ripeIPs.forEach(ip => {
            if (ip.includes('/')) {
                const ipsFromCIDR = generateIPsFromCIDR(ip);
                ipData.push(...ipsFromCIDR);
            } else {
                ipData.push(ip);
            }
        });

        self.postMessage({ log: `Processing ${ipData.length} IPs...` });
        self.postMessage({ ipData });
    } catch (error) {
        self.postMessage({ log: `Error: ${error.message}` });
    }
});
