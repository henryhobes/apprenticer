# CoreWeave facts: the only facts to use

Every claim about CoreWeave in this session comes from this file. Company figures are from CoreWeave's own SEC filings and press releases, checked on 5 November 2026 and cited under each section. The newest results are for the quarter ended 30 June 2026 (reported 11 August 2026); the third-quarter 2026 results are due on 10 November 2026, so say "as of the middle of 2026" if asked whether a number is current. Anything modelled is marked "modelled" and is arithmetic on a cited number, shown so it can be checked. Never present a modelled number as one CoreWeave reported.

## What CoreWeave is

- CoreWeave is a cloud company that rents out NVIDIA GPUs, the chips AI is trained and run on, by the hour. It does not design chips and does not build AI models. It buys the GPUs, puts them in data centers with the power, cooling and fast networks they need, and rents time on them, plus storage and software for running AI work.
- Its own description of the market: "Generalized clouds operated by hyperscalers were not built to serve the specific requirements of AI", designed for "search, e-commerce, generalized web-hosting, and databases". CoreWeave sells only AI computing. (S-1)
- A hyperscaler is one of the giant general clouds: Amazon Web Services, Microsoft Azure, Google Cloud. They rent GPUs too, alongside thousands of other services. CoreWeave is often called a "neocloud": a newer cloud built only for GPUs.
- Scale: 10 data centers and about 70 MW of active power at the end of 2023; 32 data centers, more than 250,000 GPUs and about 360 MW at the end of 2024; 43 data centers and over 850 MW at the end of 2025. By 30 June 2026, active power was 1.5 GW, with about 3.7 GW contracted. (S-1, FY2025 10-K, Q2 2026 release)
- Megawatt (MW) and gigawatt (GW): units of electric power. A GW is 1,000 MW. For a data center, the power it can draw is the hard limit on how many GPUs it can run. Don't convert gigawatts into homes or cities: there is no source here for that.
- Headquarters: Livingston, New Jersey. Co-founders named in the S-1: Michael Intrator (CEO), Brian Venturo and Brannin McBee.

Sources:
- CoreWeave S-1, filed 3 March 2025: https://www.sec.gov/Archives/edgar/data/1769628/000119312525044231/d899798ds1.htm
- CoreWeave Form 10-K for 2025: https://www.sec.gov/Archives/edgar/data/1769628/000176962826000104/crwv-20251231.htm
- CoreWeave, "CoreWeave Reports Strong Second Quarter 2026 Results", 11 August 2026: https://investors.coreweave.com/news/news-details/2026/CoreWeave-Reports-Strong-Second-Quarter-2026-Results/default.aspx

## Where it came from (only if asked)

- Formed in September 2017 as The Atlantic Crypto Corporation; renamed CoreWeave, Inc. in December 2019. It used its computers to mine cryptocurrency, mainly Ethereum, and stopped on 30 September 2022 "due to changes in Ethereum's reward policy" (Ethereum stopped paying miners that month). By then it had moved to cloud computing. (S-1)
- The through line: both businesses are about keeping expensive chips busy.

## Beat 1: what it sells (visual 01-landlord)

- List price from CoreWeave's pricing page, checked 5 November 2026: an NVIDIA HGX H100 instance (8 H100 GPUs, 128 vCPUs, 2,048 GB of system memory) is $49.24 an hour on demand. $49.24 / 8 = $6.155, about $6.16 per GPU-hour. The same page lists an 8-GPU HGX B200 at $68.80 an hour. https://www.coreweave.com/pricing
- On demand means pay as you go, by the hour, no commitment. Almost none of CoreWeave's revenue comes this way (Beat 3). Its contract prices are not public: never say they are higher or lower than the list price.
- The H100 is the GPU from the "What is a GPU?" lesson: NVIDIA's data-center chip, 80 GB of memory, up to 700 W each. Don't reteach how a GPU works; if asked, one sentence: it does thousands of small sums at once, which is what training and running AI models needs.

## Beat 2: idle hours (visual 02-hours)

- A year has 24 x 365 = 8,760 hours.
- Modelled: one H100 rented every hour of a year at the list price: 8,760 x $6.155 = about $53,900, so "about $54,000". Rented half the hours: about $27,000. This is the on-demand list price times hours, an upper bound for teaching, not what CoreWeave earns per GPU.
- An hour nobody rents it earns nothing, but the GPU keeps losing value and its costs keep running. CoreWeave depreciates its data-center computing equipment over six years (changed from five, effective 1 January 2023): it counts the cost of a GPU as spread across six years, whether or not it is rented. (S-1 and 10-K, property and equipment note)
- The money to buy GPUs is mostly borrowed. In CoreWeave's words, it has "financed the development of additional compute capacity through the use of asset-backed debt" (S-1): loans secured on the GPUs and the customer contracts they serve. Interest is owed whether the GPU is busy or idle. Its first big loan (DDTL 1.0) carried a margin of about 9.6 percentage points over a benchmark rate. (S-1)
- Utilization: the share of hours a GPU is doing paid work. For anyone renting out GPUs, it is the number the business lives or dies on.

## Beat 3: take-or-pay (visual 02-hours, "set contract")

- CoreWeave sells two ways: committed contracts, which are "take-or-pay", or on demand, "pay-as-you-go". (10-K)
- Take-or-pay: the customer reserves capacity for the contract term and pays "regardless of the level of utilization". Initial contract periods "generally range from one to six years" (10-K); the S-1 said "typically two to five years". Customers often prepay part of it.
- Committed contracts were 20% of revenue in 2022, 88% in 2023, 96% in 2024 and over 98% in 2025. (S-1, 10-K)
- So the risk of an idle GPU moves from CoreWeave to the customer: if the lab doesn't use its reserved GPUs, it still pays.
- The flywheel, in plain words: a signed multi-year contract is something a lender will lend against, the loan buys the GPUs, and the contract's payments repay the loan. That is how a company with $1.9 billion of revenue in 2024 could spend billions on GPUs. It also means CoreWeave carries a lot of debt: in 2025 alone it issued $2.0 billion of 2030 notes, $1.75 billion of 2031 notes and $2.6 billion of convertible notes. (10-K)
- The risk that is left: the customer not paying, and a GPU still being worth renting when its contract ends.

## Beat 4: when the contract ends (visual 02-hours still up)

- Contract terms "generally range from one to six years" (10-K), and CoreWeave depreciates its computing equipment over six years (S-1, 10-K). So a GPU can outlast its first contract and need a new renter.
- Newer NVIDIA chips keep arriving: CoreWeave's own pricing page lists the H100, the newer H200, and the newer still B200 and GB200. An older chip still works, but it competes with faster ones for the next renter.
- CoreWeave's filing names this as a risk: any "inability to redeploy components of our existing infrastructure to extend past their contracted life could significantly affect our business". (S-1)
- The other risk left under take-or-pay is the customer not paying: the 10-K lists "the risks of non-payment and non-performance by these customers".
- Don't predict GPU prices or say how fast H100 rents are falling: no source here for that.

## Beat 5: who the customers are (visual 03-customers)

- Microsoft was 35% of revenue in 2023, 62% in 2024 and about 67% in 2025. Its top two customers were about 77% of 2024 revenue. No other customer was 10% or more of 2025 revenue. (S-1, 10-K)
- Revenue: about $229 million in 2023 (S-1), $1.915 billion in 2024 and $5.131 billion in 2025 (10-K). Q2 2026: $2.575 billion for the quarter, against $1.212 billion a year earlier. (Q2 2026 release)
- Why Microsoft, which has its own cloud, rents from CoreWeave: it hasn't given its full reasons. What it has said in public: on earnings calls its CFO, Amy Hood, said in early 2025 that Microsoft had "been short power and space", and in late 2025 that demand was "significantly ahead of the capacity we have available". Renting finished, powered capacity from someone else is faster than building it. Say "Microsoft has said it's short of capacity", never claim to know what it runs on CoreWeave.
  - Reported by CIO Dive (January 2025): https://www.ciodive.com/news/microsoft-azure-cloud-capacity-constraints-openai-investment/731657/
  - Reported by The Irish Times / Bloomberg (30 October 2025): https://www.irishtimes.com/technology/big-tech/2025/10/30/microsofts-computing-capacity-crunch-persists-despite-heavy-spending
- Power is the scarce part: 1.5 GW of active power at 30 June 2026 against about 3.7 GW contracted, signed for but not yet running. (Q2 2026 release)
- The risk in it: when one customer is two thirds of revenue, its decisions are your business. CoreWeave's own filing lists that as a risk.

## If they ask: other customers and deals (not on the board)

- OpenAI: a contract worth up to about $11.9 billion through October 2030, signed March 2025 (10-K); an expansion of up to $4 billion in May 2025 (press reports, e.g. CNBC); and up to about $6.5 billion through May 2031, signed September 2025 (10-K). Added together, about $22.4 billion: that total is our sum of the three, as press reports also added it up.
- Meta: up to about $14.2 billion through December 2031, signed September 2025. (10-K)
- Q2 2026 named new or expanded customers including Databricks, Cognition, Runway, Grammarly, Caterpillar and Hudson River Trading. (Q2 2026 release)
- Revenue backlog, contracted revenue not yet earned: $15.1 billion of remaining performance obligations at the end of 2024 (S-1); about $104 billion of revenue backlog at 30 June 2026, up from $30.1 billion a year earlier (Q2 2026 release). Backlog is a promise, paid out over years and only if CoreWeave delivers the capacity.
- NVIDIA is both its supplier and an investor; it bought $250 million of shares at the IPO (press reports).
- CoreWeave bought Weights & Biases, a tool AI researchers use to track training runs, in 2025. (10-K)

## If they ask: the stock (keep it to this)

- CoreWeave listed on the Nasdaq on 28 March 2025 under the ticker CRWV, at $40 a share, raising about $1.5 billion. (CoreWeave pricing release: https://www.coreweave.com/blog/coreweave-announces-pricing-of-initial-public-offering)
- It reported a net loss of $626 million for Q2 2026. (Q2 2026 release)
- Never give a share price, a forecast, or a view on whether to buy. Say this lesson is about how the business works, and come back.
