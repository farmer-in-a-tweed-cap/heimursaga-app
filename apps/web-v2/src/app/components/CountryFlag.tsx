// Import flags for countries in use
// Add more as needed - these are SVG components
import US from 'country-flag-icons/react/3x2/US';
import MX from 'country-flag-icons/react/3x2/MX';
import GT from 'country-flag-icons/react/3x2/GT';
import BZ from 'country-flag-icons/react/3x2/BZ';
import CR from 'country-flag-icons/react/3x2/CR';
import PA from 'country-flag-icons/react/3x2/PA';
import CO from 'country-flag-icons/react/3x2/CO';
import PE from 'country-flag-icons/react/3x2/PE';
import CL from 'country-flag-icons/react/3x2/CL';
import AR from 'country-flag-icons/react/3x2/AR';
import ES from 'country-flag-icons/react/3x2/ES';
import PT from 'country-flag-icons/react/3x2/PT';
import GB from 'country-flag-icons/react/3x2/GB';
import FR from 'country-flag-icons/react/3x2/FR';
import DE from 'country-flag-icons/react/3x2/DE';
import IT from 'country-flag-icons/react/3x2/IT';
import JP from 'country-flag-icons/react/3x2/JP';
import CN from 'country-flag-icons/react/3x2/CN';
import AU from 'country-flag-icons/react/3x2/AU';
import NZ from 'country-flag-icons/react/3x2/NZ';
import CA from 'country-flag-icons/react/3x2/CA';
import BR from 'country-flag-icons/react/3x2/BR';
import IN from 'country-flag-icons/react/3x2/IN';
import ZA from 'country-flag-icons/react/3x2/ZA';
import EG from 'country-flag-icons/react/3x2/EG';
import KE from 'country-flag-icons/react/3x2/KE';
import MA from 'country-flag-icons/react/3x2/MA';
import TH from 'country-flag-icons/react/3x2/TH';
import VN from 'country-flag-icons/react/3x2/VN';
import ID from 'country-flag-icons/react/3x2/ID';
import PH from 'country-flag-icons/react/3x2/PH';
import KR from 'country-flag-icons/react/3x2/KR';
import NL from 'country-flag-icons/react/3x2/NL';
import BE from 'country-flag-icons/react/3x2/BE';
import CH from 'country-flag-icons/react/3x2/CH';
import AT from 'country-flag-icons/react/3x2/AT';
import GR from 'country-flag-icons/react/3x2/GR';
import SE from 'country-flag-icons/react/3x2/SE';
import NO from 'country-flag-icons/react/3x2/NO';
import DK from 'country-flag-icons/react/3x2/DK';
import FI from 'country-flag-icons/react/3x2/FI';
import IE from 'country-flag-icons/react/3x2/IE';
import PL from 'country-flag-icons/react/3x2/PL';
import CZ from 'country-flag-icons/react/3x2/CZ';
import HU from 'country-flag-icons/react/3x2/HU';
import RO from 'country-flag-icons/react/3x2/RO';
import TR from 'country-flag-icons/react/3x2/TR';
import RU from 'country-flag-icons/react/3x2/RU';
import UA from 'country-flag-icons/react/3x2/UA';
import IL from 'country-flag-icons/react/3x2/IL';
import AE from 'country-flag-icons/react/3x2/AE';
import SG from 'country-flag-icons/react/3x2/SG';
import MY from 'country-flag-icons/react/3x2/MY';
import HK from 'country-flag-icons/react/3x2/HK';
import TW from 'country-flag-icons/react/3x2/TW';
import EC from 'country-flag-icons/react/3x2/EC';
import BO from 'country-flag-icons/react/3x2/BO';
import UY from 'country-flag-icons/react/3x2/UY';
import PY from 'country-flag-icons/react/3x2/PY';
import VE from 'country-flag-icons/react/3x2/VE';
import CU from 'country-flag-icons/react/3x2/CU';
import DO from 'country-flag-icons/react/3x2/DO';
import JM from 'country-flag-icons/react/3x2/JM';
import HN from 'country-flag-icons/react/3x2/HN';
import NI from 'country-flag-icons/react/3x2/NI';
import SV from 'country-flag-icons/react/3x2/SV';
import IS from 'country-flag-icons/react/3x2/IS';
import NP from 'country-flag-icons/react/3x2/NP';
import LK from 'country-flag-icons/react/3x2/LK';
import MM from 'country-flag-icons/react/3x2/MM';
import KH from 'country-flag-icons/react/3x2/KH';
import LA from 'country-flag-icons/react/3x2/LA';
import MN from 'country-flag-icons/react/3x2/MN';
import BD from 'country-flag-icons/react/3x2/BD';
import PK from 'country-flag-icons/react/3x2/PK';
import IR from 'country-flag-icons/react/3x2/IR';
import SA from 'country-flag-icons/react/3x2/SA';
import QA from 'country-flag-icons/react/3x2/QA';
import OM from 'country-flag-icons/react/3x2/OM';
import JO from 'country-flag-icons/react/3x2/JO';
import LB from 'country-flag-icons/react/3x2/LB';
import TZ from 'country-flag-icons/react/3x2/TZ';
import UG from 'country-flag-icons/react/3x2/UG';
import RW from 'country-flag-icons/react/3x2/RW';
import ET from 'country-flag-icons/react/3x2/ET';
import GH from 'country-flag-icons/react/3x2/GH';
import NG from 'country-flag-icons/react/3x2/NG';
import SN from 'country-flag-icons/react/3x2/SN';

// Map of country codes to flag components
const flagComponents: Record<string, any> = {
  US, MX, GT, BZ, CR, PA, CO, PE, CL, AR, ES, PT,
  GB, FR, DE, IT, JP, CN, AU, NZ, CA, BR, IN, ZA,
  EG, KE, MA, TH, VN, ID, PH, KR, NL, BE, CH, AT,
  GR, SE, NO, DK, FI, IE, PL, CZ, HU, RO, TR, RU,
  UA, IL, AE, SG, MY, HK, TW, EC, BO, UY, PY, VE,
  CU, DO, JM, HN, NI, SV, IS, NP, LK, MM, KH, LA,
  MN, BD, PK, IR, SA, QA, OM, JO, LB, TZ, UG, RW,
  ET, GH, NG, SN,
};

interface CountryFlagProps {
  code: string;
  className?: string;
  title?: string;
}

export function CountryFlag({ code, className = '', title }: CountryFlagProps) {
  const FlagComponent = flagComponents[code.toUpperCase()];

  if (!FlagComponent) {
    // Fallback: show country code in a box
    return (
      <span
        className={`inline-flex items-center justify-center bg-[#616161] text-white text-xs font-bold ${className}`}
        title={title}
        style={{ aspectRatio: '3/2' }}
      >
        {code}
      </span>
    );
  }

  return <FlagComponent className={className} title={title} />;
}
