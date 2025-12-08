/**
 * Identity Constants
 * Reference data for name normalization and matching
 */

// Common name prefixes to strip
export const NAME_PREFIXES = [
  'mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'rev',
  'sir', 'madam', 'lord', 'lady', 'hon', 'judge'
];

// Common name suffixes
export const NAME_SUFFIXES = [
  'jr', 'sr', 'ii', 'iii', 'iv', 'v',
  'md', 'phd', 'dds', 'esq', 'cpa', 'rn'
];

// Common nicknames mapping
export const NICKNAME_MAP: Record<string, string[]> = {
  'william': ['will', 'bill', 'billy', 'willy', 'liam'],
  'robert': ['rob', 'bob', 'bobby', 'robby', 'bert'],
  'richard': ['rich', 'rick', 'dick', 'ricky', 'richie'],
  'michael': ['mike', 'mikey', 'mick', 'mickey'],
  'james': ['jim', 'jimmy', 'jamie', 'jem'],
  'john': ['jack', 'johnny', 'jon'],
  'joseph': ['joe', 'joey', 'jojo'],
  'thomas': ['tom', 'tommy', 'thom'],
  'charles': ['charlie', 'chuck', 'chas'],
  'david': ['dave', 'davey', 'davie'],
  'daniel': ['dan', 'danny', 'dani'],
  'matthew': ['matt', 'matty'],
  'anthony': ['tony', 'ant', 'anton'],
  'donald': ['don', 'donny', 'donnie'],
  'steven': ['steve', 'stevie', 'stefan'],
  'stephen': ['steve', 'stevie', 'steph'],
  'edward': ['ed', 'eddie', 'ted', 'teddy', 'ned'],
  'christopher': ['chris', 'topher', 'kit'],
  'kenneth': ['ken', 'kenny'],
  'andrew': ['andy', 'drew', 'andre'],
  'joshua': ['josh'],
  'nicholas': ['nick', 'nicky', 'nico'],
  'samuel': ['sam', 'sammy'],
  'benjamin': ['ben', 'benny', 'benji'],
  'alexander': ['alex', 'al', 'xander', 'sandy'],
  'elizabeth': ['liz', 'lizzy', 'beth', 'betsy', 'eliza', 'lisa', 'libby'],
  'jennifer': ['jen', 'jenny', 'jenn'],
  'margaret': ['maggie', 'meg', 'marge', 'peggy', 'greta'],
  'katherine': ['kate', 'katie', 'kathy', 'kat', 'kit'],
  'catherine': ['cathy', 'cat', 'kate', 'katie'],
  'patricia': ['pat', 'patty', 'trish', 'tricia'],
  'barbara': ['barb', 'barbie', 'babs'],
  'susan': ['sue', 'susie', 'suzy'],
  'jessica': ['jess', 'jessie'],
  'rebecca': ['becca', 'becky', 'reba'],
  'deborah': ['deb', 'debby', 'debbie'],
  'stephanie': ['steph', 'stephie', 'steffie'],
  'christine': ['chris', 'chrissy', 'tina'],
  'christina': ['chris', 'chrissy', 'tina'],
  'victoria': ['vicky', 'vicki', 'tori'],
  'samantha': ['sam', 'sammy'],
  'alexandra': ['alex', 'lexi', 'sandra', 'sandy'],
  'abigail': ['abby', 'gail'],
  'angela': ['angie', 'angel'],
  'gabrielle': ['gabby', 'gabi', 'elle'],
  'natalie': ['nat', 'natty', 'talie'],
  'theodore': ['ted', 'teddy', 'theo'],
  'timothy': ['tim', 'timmy'],
  'gregory': ['greg', 'gregg'],
  'lawrence': ['larry', 'lars', 'laurie'],
  'raymond': ['ray', 'raymon'],
  'gerald': ['gerry', 'jerry'],
  'walter': ['walt', 'wally'],
  'henry': ['hank', 'harry', 'hal'],
  'frederick': ['fred', 'freddy', 'freddie', 'fritz'],
  'arthur': ['art', 'artie'],
  'albert': ['al', 'bert', 'bertie'],
  'harold': ['hal', 'harry'],
  'eugene': ['gene'],
  'leonard': ['leo', 'lenny', 'len'],
  'francis': ['frank', 'frankie', 'fran'],
  'phillip': ['phil'],
  'douglas': ['doug', 'dougie'],
  'russell': ['russ', 'rusty'],
  'louis': ['lou', 'louie'],
  'ronald': ['ron', 'ronny', 'ronnie'],
  'jonathan': ['jon', 'jonny', 'nathan'],
  'nathaniel': ['nate', 'nathan', 'nat'],
  'zachary': ['zach', 'zack'],
  'jacob': ['jake', 'jack']
};

// Address abbreviations
export const ADDRESS_ABBREVIATIONS: Record<string, string> = {
  'street': 'st',
  'avenue': 'ave',
  'boulevard': 'blvd',
  'drive': 'dr',
  'lane': 'ln',
  'road': 'rd',
  'place': 'pl',
  'court': 'ct',
  'circle': 'cir',
  'highway': 'hwy',
  'parkway': 'pkwy',
  'terrace': 'ter',
  'way': 'way',
  'north': 'n',
  'south': 's',
  'east': 'e',
  'west': 'w',
  'northeast': 'ne',
  'northwest': 'nw',
  'southeast': 'se',
  'southwest': 'sw',
  'apartment': 'apt',
  'suite': 'ste',
  'unit': 'unit',
  'building': 'bldg',
  'floor': 'fl',
  'room': 'rm',
  'po box': 'po box',
  'post office box': 'po box'
};

// State abbreviations
export const STATE_ABBREVIATIONS: Record<string, string> = {
  'alabama': 'al',
  'alaska': 'ak',
  'arizona': 'az',
  'arkansas': 'ar',
  'california': 'ca',
  'colorado': 'co',
  'connecticut': 'ct',
  'delaware': 'de',
  'florida': 'fl',
  'georgia': 'ga',
  'hawaii': 'hi',
  'idaho': 'id',
  'illinois': 'il',
  'indiana': 'in',
  'iowa': 'ia',
  'kansas': 'ks',
  'kentucky': 'ky',
  'louisiana': 'la',
  'maine': 'me',
  'maryland': 'md',
  'massachusetts': 'ma',
  'michigan': 'mi',
  'minnesota': 'mn',
  'mississippi': 'ms',
  'missouri': 'mo',
  'montana': 'mt',
  'nebraska': 'ne',
  'nevada': 'nv',
  'new hampshire': 'nh',
  'new jersey': 'nj',
  'new mexico': 'nm',
  'new york': 'ny',
  'north carolina': 'nc',
  'north dakota': 'nd',
  'ohio': 'oh',
  'oklahoma': 'ok',
  'oregon': 'or',
  'pennsylvania': 'pa',
  'rhode island': 'ri',
  'south carolina': 'sc',
  'south dakota': 'sd',
  'tennessee': 'tn',
  'texas': 'tx',
  'utah': 'ut',
  'vermont': 'vt',
  'virginia': 'va',
  'washington': 'wa',
  'west virginia': 'wv',
  'wisconsin': 'wi',
  'wyoming': 'wy',
  'district of columbia': 'dc'
};

// Common phone country codes
export const PHONE_COUNTRY_CODES = [
  '+1', '1', '001' // US
];

// Invalid/placeholder phone patterns
export const INVALID_PHONE_PATTERNS = [
  /^0{10}$/,
  /^1{10}$/,
  /^9{10}$/,
  /^1234567890$/,
  /^0123456789$/,
  /^5551234$/,
  /^555\d{4}$/
];

// Invalid/placeholder email patterns
export const INVALID_EMAIL_PATTERNS = [
  /^test@/i,
  /^noemail@/i,
  /^none@/i,
  /^na@/i,
  /^n\/a@/i,
  /^no-email@/i,
  /^noreply@/i,
  /@example\.com$/i,
  /@test\.com$/i
];

// Corporate entity suffixes
export const CORPORATE_SUFFIXES = [
  'llc', 'l.l.c.', 'l l c',
  'inc', 'inc.', 'incorporated',
  'corp', 'corp.', 'corporation',
  'co', 'co.', 'company',
  'ltd', 'ltd.', 'limited',
  'lp', 'l.p.', 'limited partnership',
  'llp', 'l.l.p.',
  'pllc', 'p.l.l.c.',
  'pc', 'p.c.', 'professional corporation',
  'pa', 'p.a.', 'professional association',
  'dba', 'd/b/a', 'doing business as'
];

// Trust indicators
export const TRUST_INDICATORS = [
  'trust',
  'family trust',
  'living trust',
  'revocable trust',
  'irrevocable trust',
  'trustee',
  'ttee'
];

// Estate indicators
export const ESTATE_INDICATORS = [
  'estate',
  'estate of',
  'heir',
  'heirs',
  'deceased',
  'dec\'d'
];
