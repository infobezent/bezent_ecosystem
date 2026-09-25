import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import {
  FormSection,
  FormGrid,
  FormField,
  Input,
  Select,
  Button,
  Stack,
  Inline,
  Card,
  CardTitle,
  Toolbar,
} from '../../../../design-system/components';
import { useCustomFields } from '../../settings/context/CustomFieldsContext';

import type {
  OnboardingCardConfig,
  OnboardingFieldConfig,
} from '../../settings/types/settingsCenter';

// Comprehensive Head/GPO PIN Code & State map for major Indian cities
// Comprehensive Head/GPO PIN Code & State map for major Indian cities
const MAJOR_CITY_PIN_MAP: Record<
  string,
  { pin: string; city: string; district?: string; state: string }
> = {
  // Tamil Nadu
  chennai: { pin: '600001', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu' },
  madras: { pin: '600001', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu' },
  coimbatore: { pin: '641001', city: 'Coimbatore', district: 'Coimbatore', state: 'Tamil Nadu' },
  madurai: { pin: '625001', city: 'Madurai', district: 'Madurai', state: 'Tamil Nadu' },
  trichy: {
    pin: '620001',
    city: 'Tiruchirappalli',
    district: 'Tiruchirappalli',
    state: 'Tamil Nadu',
  },
  tiruchirappalli: {
    pin: '620001',
    city: 'Tiruchirappalli',
    district: 'Tiruchirappalli',
    state: 'Tamil Nadu',
  },
  salem: { pin: '636001', city: 'Salem', district: 'Salem', state: 'Tamil Nadu' },
  tirupur: { pin: '641601', city: 'Tirupur', district: 'Tirupur', state: 'Tamil Nadu' },
  vellore: { pin: '632001', city: 'Vellore', district: 'Vellore', state: 'Tamil Nadu' },
  erode: { pin: '638001', city: 'Erode', district: 'Erode', state: 'Tamil Nadu' },
  thanjavur: { pin: '613001', city: 'Thanjavur', district: 'Thanjavur', state: 'Tamil Nadu' },
  tirunelveli: { pin: '627001', city: 'Tirunelveli', district: 'Tirunelveli', state: 'Tamil Nadu' },
  thoothukudi: { pin: '628001', city: 'Thoothukudi', district: 'Thoothukudi', state: 'Tamil Nadu' },
  tuticorin: { pin: '628001', city: 'Thoothukudi', district: 'Thoothukudi', state: 'Tamil Nadu' },
  dindigul: { pin: '624001', city: 'Dindigul', district: 'Dindigul', state: 'Tamil Nadu' },
  kanchipuram: { pin: '631501', city: 'Kanchipuram', district: 'Kanchipuram', state: 'Tamil Nadu' },
  hosur: { pin: '635109', city: 'Hosur', district: 'Krishnagiri', state: 'Tamil Nadu' },
  krishnagiri: { pin: '635001', city: 'Krishnagiri', district: 'Krishnagiri', state: 'Tamil Nadu' },
  cuddalore: { pin: '607001', city: 'Cuddalore', district: 'Cuddalore', state: 'Tamil Nadu' },
  karur: { pin: '639001', city: 'Karur', district: 'Karur', state: 'Tamil Nadu' },
  nagercoil: { pin: '629001', city: 'Nagercoil', district: 'Kanyakumari', state: 'Tamil Nadu' },

  // Karnataka
  bengaluru: { pin: '560001', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka' },
  bangalore: { pin: '560001', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka' },
  mysuru: { pin: '570001', city: 'Mysuru', district: 'Mysuru', state: 'Karnataka' },
  mysore: { pin: '570001', city: 'Mysuru', district: 'Mysuru', state: 'Karnataka' },
  mangaluru: { pin: '575001', city: 'Mangaluru', district: 'Dakshina Kannada', state: 'Karnataka' },
  mangalore: { pin: '575001', city: 'Mangaluru', district: 'Dakshina Kannada', state: 'Karnataka' },
  hubballi: { pin: '580020', city: 'Hubballi', district: 'Dharwad', state: 'Karnataka' },
  hubli: { pin: '580020', city: 'Hubballi', district: 'Dharwad', state: 'Karnataka' },
  belagavi: { pin: '590001', city: 'Belagavi', district: 'Belagavi', state: 'Karnataka' },
  belgaum: { pin: '590001', city: 'Belagavi', district: 'Belagavi', state: 'Karnataka' },
  davangere: { pin: '577001', city: 'Davangere', district: 'Davangere', state: 'Karnataka' },
  ballari: { pin: '583101', city: 'Ballari', district: 'Ballari', state: 'Karnataka' },
  bellary: { pin: '583101', city: 'Ballari', district: 'Ballari', state: 'Karnataka' },
  shivamogga: { pin: '577201', city: 'Shivamogga', district: 'Shivamogga', state: 'Karnataka' },
  shimoga: { pin: '577201', city: 'Shivamogga', district: 'Shivamogga', state: 'Karnataka' },

  // Maharashtra
  mumbai: { pin: '400001', city: 'Mumbai', district: 'Mumbai City', state: 'Maharashtra' },
  bombay: { pin: '400001', city: 'Mumbai', district: 'Mumbai City', state: 'Maharashtra' },
  pune: { pin: '411001', city: 'Pune', district: 'Pune', state: 'Maharashtra' },
  nagpur: { pin: '440001', city: 'Nagpur', district: 'Nagpur', state: 'Maharashtra' },
  nashik: { pin: '422001', city: 'Nashik', district: 'Nashik', state: 'Maharashtra' },
  thane: { pin: '400601', city: 'Thane', district: 'Thane', state: 'Maharashtra' },
  aurangabad: {
    pin: '431001',
    city: 'Chhatrapati Sambhajinagar',
    district: 'Chhatrapati Sambhajinagar',
    state: 'Maharashtra',
  },
  chhatrapatisambhajinagar: {
    pin: '431001',
    city: 'Chhatrapati Sambhajinagar',
    district: 'Chhatrapati Sambhajinagar',
    state: 'Maharashtra',
  },
  solapur: { pin: '413001', city: 'Solapur', district: 'Solapur', state: 'Maharashtra' },
  kolhapur: { pin: '416001', city: 'Kolhapur', district: 'Kolhapur', state: 'Maharashtra' },
  navimumbai: { pin: '400703', city: 'Navi Mumbai', district: 'Thane', state: 'Maharashtra' },

  // Delhi NCR
  delhi: { pin: '110001', city: 'Delhi', district: 'Central Delhi', state: 'Delhi' },
  newdelhi: { pin: '110001', city: 'New Delhi', district: 'Central Delhi', state: 'Delhi' },
  noida: { pin: '201301', city: 'Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh' },
  gurugram: { pin: '122001', city: 'Gurugram', district: 'Gurugram', state: 'Haryana' },
  gurgaon: { pin: '122001', city: 'Gurugram', district: 'Gurugram', state: 'Haryana' },
  faridabad: { pin: '121001', city: 'Faridabad', district: 'Faridabad', state: 'Haryana' },
  ghaziabad: { pin: '201001', city: 'Ghaziabad', district: 'Ghaziabad', state: 'Uttar Pradesh' },

  // Telangana & Andhra Pradesh
  hyderabad: { pin: '500001', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana' },
  secunderabad: { pin: '500003', city: 'Secunderabad', district: 'Hyderabad', state: 'Telangana' },
  warangal: { pin: '506001', city: 'Warangal', district: 'Warangal', state: 'Telangana' },
  visakhapatnam: {
    pin: '530001',
    city: 'Visakhapatnam',
    district: 'Visakhapatnam',
    state: 'Andhra Pradesh',
  },
  vizag: {
    pin: '530001',
    city: 'Visakhapatnam',
    district: 'Visakhapatnam',
    state: 'Andhra Pradesh',
  },
  vijayawada: { pin: '520001', city: 'Vijayawada', district: 'NTR', state: 'Andhra Pradesh' },
  guntur: { pin: '522001', city: 'Guntur', district: 'Guntur', state: 'Andhra Pradesh' },
  tirupati: { pin: '517501', city: 'Tirupati', district: 'Tirupati', state: 'Andhra Pradesh' },
  kakinada: { pin: '533001', city: 'Kakinada', district: 'Kakinada', state: 'Andhra Pradesh' },
  rajahmundry: {
    pin: '533101',
    city: 'Rajahmundry',
    district: 'East Godavari',
    state: 'Andhra Pradesh',
  },
  nellore: { pin: '524001', city: 'Nellore', district: 'SPSR Nellore', state: 'Andhra Pradesh' },
  kurnool: { pin: '518001', city: 'Kurnool', district: 'Kurnool', state: 'Andhra Pradesh' },

  // West Bengal
  kolkata: { pin: '700001', city: 'Kolkata', district: 'Kolkata', state: 'West Bengal' },
  calcutta: { pin: '700001', city: 'Kolkata', district: 'Kolkata', state: 'West Bengal' },
  howrah: { pin: '711101', city: 'Howrah', district: 'Howrah', state: 'West Bengal' },
  siliguri: { pin: '734001', city: 'Siliguri', district: 'Darjeeling', state: 'West Bengal' },
  durgapur: {
    pin: '713201',
    city: 'Durgapur',
    district: 'Paschim Bardhaman',
    state: 'West Bengal',
  },

  // Gujarat
  ahmedabad: { pin: '380001', city: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat' },
  surat: { pin: '395001', city: 'Surat', district: 'Surat', state: 'Gujarat' },
  vadodara: { pin: '390001', city: 'Vadodara', district: 'Vadodara', state: 'Gujarat' },
  baroda: { pin: '390001', city: 'Vadodara', district: 'Vadodara', state: 'Gujarat' },
  rajkot: { pin: '360001', city: 'Rajkot', district: 'Rajkot', state: 'Gujarat' },
  bhavnagar: { pin: '364001', city: 'Bhavnagar', district: 'Bhavnagar', state: 'Gujarat' },
  jamnagar: { pin: '361001', city: 'Jamnagar', district: 'Jamnagar', state: 'Gujarat' },

  // Kerala
  kochi: { pin: '682001', city: 'Kochi', district: 'Ernakulam', state: 'Kerala' },
  cochin: { pin: '682001', city: 'Kochi', district: 'Ernakulam', state: 'Kerala' },
  ernakulam: { pin: '682001', city: 'Kochi', district: 'Ernakulam', state: 'Kerala' },
  thiruvananthapuram: {
    pin: '695001',
    city: 'Thiruvananthapuram',
    district: 'Thiruvananthapuram',
    state: 'Kerala',
  },
  trivandrum: {
    pin: '695001',
    city: 'Thiruvananthapuram',
    district: 'Thiruvananthapuram',
    state: 'Kerala',
  },
  kozhikode: { pin: '673001', city: 'Kozhikode', district: 'Kozhikode', state: 'Kerala' },
  calicut: { pin: '673001', city: 'Kozhikode', district: 'Kozhikode', state: 'Kerala' },
  thrissur: { pin: '680001', city: 'Thrissur', district: 'Thrissur', state: 'Kerala' },
  kollam: { pin: '691001', city: 'Kollam', district: 'Kollam', state: 'Kerala' },
  kottayam: { pin: '686001', city: 'Kottayam', district: 'Kottayam', state: 'Kerala' },
  kannur: { pin: '670001', city: 'Kannur', district: 'Kannur', state: 'Kerala' },

  // Uttar Pradesh
  lucknow: { pin: '226001', city: 'Lucknow', district: 'Lucknow', state: 'Uttar Pradesh' },
  kanpur: { pin: '208001', city: 'Kanpur', district: 'Kanpur Nagar', state: 'Uttar Pradesh' },
  agra: { pin: '282001', city: 'Agra', district: 'Agra', state: 'Uttar Pradesh' },
  varanasi: { pin: '221001', city: 'Varanasi', district: 'Varanasi', state: 'Uttar Pradesh' },
  banaras: { pin: '221001', city: 'Varanasi', district: 'Varanasi', state: 'Uttar Pradesh' },
  meerut: { pin: '250001', city: 'Meerut', district: 'Meerut', state: 'Uttar Pradesh' },
  prayagraj: { pin: '211001', city: 'Prayagraj', district: 'Prayagraj', state: 'Uttar Pradesh' },
  allahabad: { pin: '211001', city: 'Prayagraj', district: 'Prayagraj', state: 'Uttar Pradesh' },

  // Other States / Capitals
  jaipur: { pin: '302001', city: 'Jaipur', district: 'Jaipur', state: 'Rajasthan' },
  jodhpur: { pin: '342001', city: 'Jodhpur', district: 'Jodhpur', state: 'Rajasthan' },
  udaipur: { pin: '313001', city: 'Udaipur', district: 'Udaipur', state: 'Rajasthan' },
  chandigarh: { pin: '160001', city: 'Chandigarh', district: 'Chandigarh', state: 'Chandigarh' },
  indore: { pin: '452001', city: 'Indore', district: 'Indore', state: 'Madhya Pradesh' },
  bhopal: { pin: '462001', city: 'Bhopal', district: 'Bhopal', state: 'Madhya Pradesh' },
  patna: { pin: '800001', city: 'Patna', district: 'Patna', state: 'Bihar' },
  ranchi: { pin: '834001', city: 'Ranchi', district: 'Ranchi', state: 'Jharkhand' },
  bhubaneswar: { pin: '751001', city: 'Bhubaneswar', district: 'Khurda', state: 'Odisha' },
  guwahati: { pin: '781001', city: 'Guwahati', district: 'Kamrup Metropolitan', state: 'Assam' },
  ludhiana: { pin: '141001', city: 'Ludhiana', district: 'Ludhiana', state: 'Punjab' },
  amritsar: { pin: '143001', city: 'Amritsar', district: 'Amritsar', state: 'Punjab' },
  dehradun: { pin: '248001', city: 'Dehradun', district: 'Dehradun', state: 'Uttarakhand' },
  shimla: { pin: '171001', city: 'Shimla', district: 'Shimla', state: 'Himachal Pradesh' },
  jammu: { pin: '180001', city: 'Jammu', district: 'Jammu', state: 'Jammu & Kashmir' },
  srinagar: { pin: '190001', city: 'Srinagar', district: 'Srinagar', state: 'Jammu & Kashmir' },
  puducherry: { pin: '605001', city: 'Puducherry', district: 'Puducherry', state: 'Puducherry' },
  pondicherry: { pin: '605001', city: 'Puducherry', district: 'Puducherry', state: 'Puducherry' },
  raipur: { pin: '492001', city: 'Raipur', district: 'Raipur', state: 'Chhattisgarh' },
  panaji: { pin: '403001', city: 'Panaji', district: 'North Goa', state: 'Goa' },
};

export interface FamilyMemberRecord {
  id: string;
  name: string;
  relationship: string;
  otherRelationship?: string;
  dob: string;
  countryCode: string;
  phone: string;
}

export interface NomineeRecord {
  id: string;
  name: string;
  relationship: string;
  otherRelationship?: string;
  sharePercentage: number | '';
}

interface PersonalInformationProps {
  employeeId: string;
}

export function PersonalInformation({ employeeId }: PersonalInformationProps) {
  // 1. Profile Photo
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // 3-6. Name fields
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [preferredName, setPreferredName] = useState('');

  // 7. Gender
  const [gender, setGender] = useState('Male');
  const [otherGender, setOtherGender] = useState('');

  // 8. Date of Birth
  const [dob, setDob] = useState('');

  // 9. Marital Status
  const [maritalStatus, setMaritalStatus] = useState('Single');
  const [otherMaritalStatus, setOtherMaritalStatus] = useState('');

  // 10. Blood Group
  const [bloodGroup, setBloodGroup] = useState('O+');

  // 11. Nationality
  const [nationality, setNationality] = useState('Indian');
  const [otherNationality, setOtherNationality] = useState('');

  // 12. Native Language
  const [nativeLanguage, setNativeLanguage] = useState('English');
  const [otherNativeLanguage, setOtherNativeLanguage] = useState('');

  // 13-14. Parents / Guardian
  const [fatherName, setFatherName] = useState('');
  const [guardianName, setGuardianName] = useState('');

  // 15. Family Members (Repeatable)
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberRecord[]>([
    {
      id: 'fam_1',
      name: '',
      relationship: 'Spouse',
      dob: '',
      countryCode: '+91',
      phone: '',
    },
  ]);

  // 16. Nomination Details (Repeatable)
  const [nominees, setNominees] = useState<NomineeRecord[]>([
    {
      id: 'nom_1',
      name: '',
      relationship: 'Spouse',
      sharePercentage: 100,
    },
  ]);

  // 17. Time Zone
  const [timeZone, setTimeZone] = useState('(GMT+05:30) Asia/Kolkata (IST)');

  // 18-21. Phones
  const [mobileCountryCode, setMobileCountryCode] = useState('+91');
  const [mobilePhone, setMobilePhone] = useState('');

  const [homeCountryCode, setHomeCountryCode] = useState('+91');
  const [homePhone, setHomePhone] = useState('');

  const [businessCountryCode, setBusinessCountryCode] = useState('+91');
  const [businessPhone, setBusinessPhone] = useState('');

  const [workCountryCode, setWorkCountryCode] = useState('+91');
  const [workPhone, setWorkPhone] = useState('');

  // 22. Email Address
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  // 23-28. Address Details
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [country, setCountry] = useState('India');
  const [postalStatus, setPostalStatus] = useState<string | null>(null);
  const [postalLoading, setPostalLoading] = useState(false);

  const [cityStatus, setCityStatus] = useState<string | null>(null);
  const [cityLoading, setCityLoading] = useState(false);
  const [availablePincodes, setAvailablePincodes] = useState<
    Array<{ name: string; pincode: string; state: string }>
  >([]);

  const cityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Photo Upload Handler
  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size exceeds 5MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 1. Real Postal API Lookup by 6-digit PIN Code
  useEffect(() => {
    const cleanPin = pinCode.trim();
    if (/^[1-9][0-9]{5}$/.test(cleanPin)) {
      setPostalLoading(true);
      setPostalStatus('Fetching location details...');
      fetch(`https://api.postalpincode.in/pincode/${cleanPin}`)
        .then((res) => res.json())
        .then((data) => {
          setPostalLoading(false);
          if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice?.length > 0) {
            const po = data[0].PostOffice[0];
            const fetchedDistrict = po.District || '';
            const fetchedState = po.State;
            const fetchedCountry = po.Country || 'India';

            setPostalStatus(
              `Verified: ${po.District || po.Name}, ${fetchedState}, ${fetchedCountry}`,
            );
            if (fetchedDistrict) setDistrict(fetchedDistrict);
            // Only set city if city is currently empty (prevent overwriting user-typed city with District)
            if (!city) {
              const cityCandidate =
                po.Block && po.Block !== 'NA'
                  ? po.Block
                  : po.Name !== po.District
                    ? po.Name
                    : po.District;
              setCity(cityCandidate);
            }
            setState(fetchedState);
            setCountry(fetchedCountry);
          } else {
            setPostalStatus('PIN code not found in official registry.');
          }
        })
        .catch(() => {
          setPostalLoading(false);
          setPostalStatus(null);
        });
    } else {
      setPostalStatus(null);
    }
  }, [pinCode, city]);

  // 2. City Name Lookup -> Auto-generates PIN Code & State
  const handleCityChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCity(val);

    const normalized = val
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    if (cityTimerRef.current) {
      clearTimeout(cityTimerRef.current);
    }

    // Direct match in local dictionary for 100% instant accuracy on major Indian cities
    if (MAJOR_CITY_PIN_MAP[normalized]) {
      const match = MAJOR_CITY_PIN_MAP[normalized]!;
      setPinCode(match.pin);
      setDistrict(match.district || match.city);
      setState(match.state);
      setCountry('India');
      setCityStatus(`Auto-generated PIN: ${match.pin} (${match.state})`);
      setAvailablePincodes([]);
      setCityLoading(false);
      return;
    }

    // Debounced API search for other cities/towns in India
    const cleanCity = val.trim();
    if (cleanCity.length >= 3) {
      setCityLoading(true);
      setCityStatus('Fetching PIN code for city...');

      cityTimerRef.current = setTimeout(() => {
        fetch(`https://api.postalpincode.in/postoffice/${encodeURIComponent(cleanCity)}`)
          .then((res) => res.json())
          .then((data) => {
            setCityLoading(false);
            if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice?.length > 0) {
              const offices: Array<{
                Name: string;
                Pincode: string;
                State: string;
                District: string;
              }> = data[0].PostOffice;

              // Find best matching post office (GPO, HO, District match, or prefix match)
              const lowerCity = cleanCity.toLowerCase();
              const bestMatch =
                offices.find(
                  (o) =>
                    o.Name.toLowerCase().includes('g.p.o') ||
                    o.Name.toLowerCase().includes('gpo') ||
                    o.Name.toLowerCase().includes('h.o'),
                ) ||
                offices.find((o) => o.District && o.District.toLowerCase() === lowerCity) ||
                offices.find((o) => o.Name.toLowerCase().startsWith(lowerCity)) ||
                offices[0]!;

              setPinCode(bestMatch.Pincode);
              if (bestMatch.District) setDistrict(bestMatch.District);
              if (bestMatch.State) setState(bestMatch.State);
              setCountry('India');
              setCityStatus(`Auto-generated PIN: ${bestMatch.Pincode} (${bestMatch.State})`);

              // Extract unique PIN codes for area selector dropdown
              const uniquePins = new Map<
                string,
                { name: string; pincode: string; state: string }
              >();
              offices.forEach((o) => {
                if (!uniquePins.has(o.Pincode)) {
                  uniquePins.set(o.Pincode, {
                    name: o.Name,
                    pincode: o.Pincode,
                    state: o.State,
                  });
                }
              });
              setAvailablePincodes(Array.from(uniquePins.values()).slice(0, 15));
            } else {
              setCityStatus(null);
              setAvailablePincodes([]);
            }
          })
          .catch(() => {
            setCityLoading(false);
            setCityStatus(null);
          });
      }, 400);
    } else {
      setCityLoading(false);
      setCityStatus(null);
      setAvailablePincodes([]);
    }
  };

  // Email Validation
  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (val && !/\S+@\S+\.\S+/.test(val)) {
      setEmailError('Please enter a valid email address (e.g. user@example.com)');
    } else {
      setEmailError(null);
    }
  };

  // Family Member Operations
  const addFamilyMember = () => {
    setFamilyMembers([
      ...familyMembers,
      {
        id: `fam_${Date.now()}`,
        name: '',
        relationship: 'Spouse',
        dob: '',
        countryCode: '+91',
        phone: '',
      },
    ]);
  };

  const removeFamilyMember = (id: string) => {
    setFamilyMembers(familyMembers.filter((f) => f.id !== id));
  };

  const updateFamilyMember = (id: string, field: keyof FamilyMemberRecord, value: string) => {
    setFamilyMembers(familyMembers.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  };

  // Nominee Operations
  const addNominee = () => {
    setNominees([
      ...nominees,
      {
        id: `nom_${Date.now()}`,
        name: '',
        relationship: 'Spouse',
        sharePercentage: 0,
      },
    ]);
  };

  const removeNominee = (id: string) => {
    setNominees(nominees.filter((n) => n.id !== id));
  };

  const updateNominee = (id: string, field: keyof NomineeRecord, value: string | number) => {
    setNominees(nominees.map((n) => (n.id === id ? { ...n, [field]: value } : n)));
  };

  let customCards: OnboardingCardConfig[] = [];
  let customFields: OnboardingFieldConfig[] = [];
  try {
    const ctx = useCustomFields();
    customCards = ctx.cards.filter((c) => c.sectionId === 'personal');
    customFields = ctx.fields.filter((f) => f.sectionId === 'personal');
  } catch {
    // fallback if context is not present
  }

  const renderCustomFieldsForCard = (cardId: string) => {
    const fieldsInCard = customFields.filter((f) => f.cardId === cardId && f.isCustom);
    return fieldsInCard.map((f) => (
      <FormField
        key={f.id}
        label={f.label}
        htmlFor={`custom-${f.id}`}
        required={f.required}
        disabled={f.readOnly}
      >
        {f.fieldType === 'select' ? (
          <Select
            id={`custom-${f.id}`}
            disabled={f.readOnly}
            options={[
              { value: '', label: `Select ${f.label}` },
              ...(f.options?.map((opt) => ({ value: opt, label: opt })) || []),
            ]}
          />
        ) : (
          <Input
            id={`custom-${f.id}`}
            type={f.fieldType === 'date' ? 'date' : f.fieldType === 'number' ? 'number' : 'text'}
            placeholder={f.defaultValue || `Enter ${f.label}`}
            disabled={f.readOnly}
          />
        )}
      </FormField>
    ));
  };

  return (
    <Stack gap="xl">
      {/* SECTION 1: PERSONAL DETAILS */}
      <FormSection
        title="Personal Details"
        description="Personal background, identity, and demographic information"
      >
        <Stack gap="lg">
          {/* Profile Photo */}
          <div className="bezent-photo-uploader">
            {photoPreview ? (
              <img src={photoPreview} alt="Profile Preview" className="bezent-photo-preview" />
            ) : (
              <div className="bezent-photo-placeholder">
                {firstName ? firstName[0]?.toUpperCase() : '👤'}
              </div>
            )}
            <Stack gap="xs">
              <Inline gap="xs" align="center">
                <span className="bezent-card__title">Profile Photo</span>
                <span className="bezent-card__desc">(Supports JPG, PNG under 5MB)</span>
              </Inline>
              <Inline gap="sm">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                >
                  Upload Photo
                </Button>
                {photoPreview && (
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => setPhotoPreview(null)}
                  >
                    Remove
                  </Button>
                )}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  hidden
                  onChange={handlePhotoChange}
                />
              </Inline>
            </Stack>
          </div>

          {/* Form Fields Grid */}
          <FormGrid columns={2} layout="horizontal" labelWidth="md">
            {/* 2. Employee ID (Read-only) */}
            <FormField label="Employee ID" htmlFor="pers-employee-id" required disabled>
              <Input id="pers-employee-id" type="text" value={employeeId} disabled />
            </FormField>

            {/* 3. First Name */}
            <FormField label="First Name" htmlFor="pers-first-name" required>
              <Input
                id="pers-first-name"
                type="text"
                placeholder="e.g. Arun"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </FormField>

            {/* 4. Middle Name */}
            <FormField label="Middle Name" htmlFor="pers-middle-name">
              <Input
                id="pers-middle-name"
                type="text"
                placeholder="e.g. Kumar"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
              />
            </FormField>

            {/* 5. Last Name */}
            <FormField label="Last Name" htmlFor="pers-last-name" required>
              <Input
                id="pers-last-name"
                type="text"
                placeholder="e.g. Sharma"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </FormField>

            {/* 6. Preferred Name */}
            <FormField label="Preferred Name" htmlFor="pers-preferred-name">
              <Input
                id="pers-preferred-name"
                type="text"
                placeholder="e.g. Arun"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
              />
            </FormField>

            {/* 7. Gender */}
            <FormField label="Gender" htmlFor="pers-gender" required>
              <Stack gap="xs">
                <Select
                  id="pers-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  options={[
                    { value: 'Male', label: 'Male' },
                    { value: 'Female', label: 'Female' },
                    { value: 'Non-binary', label: 'Non-binary' },
                    { value: 'Prefer not to say', label: 'Prefer not to say' },
                    { value: 'Other', label: 'Other' },
                  ]}
                />
                {gender === 'Other' && (
                  <Input
                    placeholder="Enter Gender..."
                    value={otherGender}
                    onChange={(e) => setOtherGender(e.target.value)}
                  />
                )}
              </Stack>
            </FormField>

            {/* 8. Date of Birth */}
            <FormField label="Date of Birth" htmlFor="pers-dob" required>
              <Input
                id="pers-dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </FormField>

            {/* 9. Marital Status */}
            <FormField label="Marital Status" htmlFor="pers-marital-status" required>
              <Stack gap="xs">
                <Select
                  id="pers-marital-status"
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  options={[
                    { value: 'Single', label: 'Single' },
                    { value: 'Married', label: 'Married' },
                    { value: 'Divorced', label: 'Divorced' },
                    { value: 'Widowed', label: 'Widowed' },
                    { value: 'Other', label: 'Other' },
                  ]}
                />
                {maritalStatus === 'Other' && (
                  <Input
                    placeholder="Enter Marital Status..."
                    value={otherMaritalStatus}
                    onChange={(e) => setOtherMaritalStatus(e.target.value)}
                  />
                )}
              </Stack>
            </FormField>

            {/* 10. Blood Group */}
            <FormField label="Blood Group" htmlFor="pers-blood-group" required>
              <Select
                id="pers-blood-group"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                options={[
                  { value: 'A+', label: 'A+' },
                  { value: 'A-', label: 'A-' },
                  { value: 'B+', label: 'B+' },
                  { value: 'B-', label: 'B-' },
                  { value: 'AB+', label: 'AB+' },
                  { value: 'AB-', label: 'AB-' },
                  { value: 'O+', label: 'O+' },
                  { value: 'O-', label: 'O-' },
                ]}
              />
            </FormField>

            {/* 11. Nationality */}
            <FormField label="Nationality" htmlFor="pers-nationality" required>
              <Stack gap="xs">
                <Select
                  id="pers-nationality"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  options={[
                    { value: 'Indian', label: 'Indian' },
                    { value: 'American', label: 'American' },
                    { value: 'British', label: 'British' },
                    { value: 'Canadian', label: 'Canadian' },
                    { value: 'Australian', label: 'Australian' },
                    { value: 'Emirati', label: 'Emirati' },
                    { value: 'Singaporean', label: 'Singaporean' },
                    { value: 'Other', label: 'Other' },
                  ]}
                />
                {nationality === 'Other' && (
                  <Input
                    placeholder="Enter Nationality..."
                    value={otherNationality}
                    onChange={(e) => setOtherNationality(e.target.value)}
                  />
                )}
              </Stack>
            </FormField>

            {/* 12. Native Language */}
            <FormField label="Native Language" htmlFor="pers-native-language" required>
              <Stack gap="xs">
                <Select
                  id="pers-native-language"
                  value={nativeLanguage}
                  onChange={(e) => setNativeLanguage(e.target.value)}
                  options={[
                    { value: 'English', label: 'English' },
                    { value: 'Hindi', label: 'Hindi' },
                    { value: 'Tamil', label: 'Tamil' },
                    { value: 'Telugu', label: 'Telugu' },
                    { value: 'Bengali', label: 'Bengali' },
                    { value: 'Marathi', label: 'Marathi' },
                    { value: 'Kannada', label: 'Kannada' },
                    { value: 'Malayalam', label: 'Malayalam' },
                    { value: 'Gujarati', label: 'Gujarati' },
                    { value: 'Punjabi', label: 'Punjabi' },
                    { value: 'Other', label: 'Other' },
                  ]}
                />
                {nativeLanguage === 'Other' && (
                  <Input
                    placeholder="Enter Native Language..."
                    value={otherNativeLanguage}
                    onChange={(e) => setOtherNativeLanguage(e.target.value)}
                  />
                )}
              </Stack>
            </FormField>

            {/* 13. Father's Name */}
            <FormField label="Father's Name" htmlFor="pers-father-name">
              <Input
                id="pers-father-name"
                type="text"
                placeholder="e.g. Ramesh Kumar"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
              />
            </FormField>

            {/* 14. Guardian Name */}
            <FormField label="Guardian Name" htmlFor="pers-guardian-name">
              <Input
                id="pers-guardian-name"
                type="text"
                placeholder="e.g. Guardian Name"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
              />
            </FormField>
          </FormGrid>
        </Stack>
      </FormSection>

      {/* SECTION 2: FAMILY & NOMINATION */}
      <FormSection
        title="Family & Nomination"
        description="Family members and policy/statutory nominee beneficiaries"
      >
        <Stack gap="xl">
          {/* 15. Family Members (Repeatable) */}
          <Stack gap="md">
            <Toolbar
              left={<CardTitle>Family Members</CardTitle>}
              right={
                <Button variant="secondary" size="sm" type="button" onClick={addFamilyMember}>
                  + Add Family Member
                </Button>
              }
            />
            {familyMembers.map((fam, idx) => (
              <Card key={fam.id} padding="md">
                <Stack gap="md">
                  <Toolbar
                    left={<CardTitle>Member #{idx + 1}</CardTitle>}
                    right={
                      familyMembers.length > 1 ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          type="button"
                          onClick={() => removeFamilyMember(fam.id)}
                        >
                          Remove
                        </Button>
                      ) : undefined
                    }
                  />
                  <FormGrid columns={2} layout="horizontal" labelWidth="md">
                    <FormField label="Name" htmlFor={`fam-name-${fam.id}`}>
                      <Input
                        id={`fam-name-${fam.id}`}
                        type="text"
                        placeholder="Full Name"
                        value={fam.name}
                        onChange={(e) => updateFamilyMember(fam.id, 'name', e.target.value)}
                      />
                    </FormField>
                    <FormField label="Relationship" htmlFor={`fam-rel-${fam.id}`}>
                      <Stack gap="xs">
                        <Select
                          id={`fam-rel-${fam.id}`}
                          value={fam.relationship}
                          onChange={(e) =>
                            updateFamilyMember(fam.id, 'relationship', e.target.value)
                          }
                          options={[
                            { value: 'Spouse', label: 'Spouse' },
                            { value: 'Father', label: 'Father' },
                            { value: 'Mother', label: 'Mother' },
                            { value: 'Son', label: 'Son' },
                            { value: 'Daughter', label: 'Daughter' },
                            { value: 'Brother', label: 'Brother' },
                            { value: 'Sister', label: 'Sister' },
                            { value: 'Other', label: 'Other' },
                          ]}
                        />
                        {fam.relationship === 'Other' && (
                          <Input
                            placeholder="Enter Relationship..."
                            value={fam.otherRelationship || ''}
                            onChange={(e) =>
                              updateFamilyMember(fam.id, 'otherRelationship', e.target.value)
                            }
                          />
                        )}
                      </Stack>
                    </FormField>
                    <FormField label="Date of Birth" htmlFor={`fam-dob-${fam.id}`}>
                      <Input
                        id={`fam-dob-${fam.id}`}
                        type="date"
                        value={fam.dob}
                        onChange={(e) => updateFamilyMember(fam.id, 'dob', e.target.value)}
                      />
                    </FormField>
                    <FormField label="Phone" htmlFor={`fam-phone-${fam.id}`}>
                      <Inline gap="xs">
                        <Select
                          value={fam.countryCode}
                          onChange={(e) =>
                            updateFamilyMember(fam.id, 'countryCode', e.target.value)
                          }
                          options={[
                            { value: '+91', label: '+91 (IN)' },
                            { value: '+1', label: '+1 (US)' },
                            { value: '+44', label: '+44 (UK)' },
                            { value: '+971', label: '+971 (UAE)' },
                          ]}
                        />
                        <Input
                          id={`fam-phone-${fam.id}`}
                          type="tel"
                          placeholder="Phone Number"
                          value={fam.phone}
                          onChange={(e) => updateFamilyMember(fam.id, 'phone', e.target.value)}
                        />
                      </Inline>
                    </FormField>
                  </FormGrid>
                </Stack>
              </Card>
            ))}
          </Stack>

          {/* 16. Nomination Details (Repeatable) */}
          <Stack gap="md">
            <Toolbar
              left={<CardTitle>Nomination Details</CardTitle>}
              right={
                <Button variant="secondary" size="sm" type="button" onClick={addNominee}>
                  + Add Nominee
                </Button>
              }
            />
            {nominees.map((nom, idx) => (
              <Card key={nom.id} padding="md">
                <Stack gap="md">
                  <Toolbar
                    left={<CardTitle>Nominee #{idx + 1}</CardTitle>}
                    right={
                      nominees.length > 1 ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          type="button"
                          onClick={() => removeNominee(nom.id)}
                        >
                          Remove
                        </Button>
                      ) : undefined
                    }
                  />
                  <FormGrid columns={2} layout="horizontal" labelWidth="md">
                    <FormField label="Nominee Name" htmlFor={`nom-name-${nom.id}`}>
                      <Input
                        id={`nom-name-${nom.id}`}
                        type="text"
                        placeholder="Full Name"
                        value={nom.name}
                        onChange={(e) => updateNominee(nom.id, 'name', e.target.value)}
                      />
                    </FormField>
                    <FormField label="Relationship" htmlFor={`nom-rel-${nom.id}`}>
                      <Stack gap="xs">
                        <Select
                          id={`nom-rel-${nom.id}`}
                          value={nom.relationship}
                          onChange={(e) => updateNominee(nom.id, 'relationship', e.target.value)}
                          options={[
                            { value: 'Spouse', label: 'Spouse' },
                            { value: 'Father', label: 'Father' },
                            { value: 'Mother', label: 'Mother' },
                            { value: 'Son', label: 'Son' },
                            { value: 'Daughter', label: 'Daughter' },
                            { value: 'Sibling', label: 'Sibling' },
                            { value: 'Other', label: 'Other' },
                          ]}
                        />
                        {nom.relationship === 'Other' && (
                          <Input
                            placeholder="Enter Relationship..."
                            value={nom.otherRelationship || ''}
                            onChange={(e) =>
                              updateNominee(nom.id, 'otherRelationship', e.target.value)
                            }
                          />
                        )}
                      </Stack>
                    </FormField>
                    <FormField label="Share % (1-100)" htmlFor={`nom-share-${nom.id}`}>
                      <Input
                        id={`nom-share-${nom.id}`}
                        type="number"
                        min="1"
                        max="100"
                        placeholder="100"
                        value={nom.sharePercentage}
                        onChange={(e) =>
                          updateNominee(nom.id, 'sharePercentage', Number(e.target.value) || '')
                        }
                      />
                    </FormField>
                  </FormGrid>
                </Stack>
              </Card>
            ))}
          </Stack>
        </Stack>
      </FormSection>

      {/* SECTION 3: CONTACT DETAILS */}
      <FormSection
        title="Contact Details"
        description="Communication details, phone numbers, and emergency contact channels"
      >
        <FormGrid columns={2} layout="horizontal" labelWidth="md">
          {/* 17. Time Zone */}
          <FormField label="Time Zone" htmlFor="pers-timezone" required>
            <Select
              id="pers-timezone"
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
              options={[
                {
                  value: '(GMT+05:30) Asia/Kolkata (IST)',
                  label: '(GMT+05:30) India Standard Time (Asia/Kolkata)',
                },
                {
                  value: '(GMT+00:00) UTC',
                  label: '(GMT+00:00) UTC (Coordinated Universal Time)',
                },
                {
                  value: '(GMT-05:00) America/New_York (EST)',
                  label: '(GMT-05:00) Eastern Time (US & Canada)',
                },
                {
                  value: '(GMT+04:00) Asia/Dubai (GST)',
                  label: '(GMT+04:00) Gulf Standard Time (Dubai)',
                },
                { value: '(GMT+08:00) Asia/Singapore (SGT)', label: '(GMT+08:00) Singapore Time' },
              ]}
            />
          </FormField>

          {/* 18. Mobile Phone */}
          <FormField label="Mobile Phone" htmlFor="pers-mobile-phone" required>
            <Inline gap="xs">
              <Select
                value={mobileCountryCode}
                onChange={(e) => setMobileCountryCode(e.target.value)}
                options={[
                  { value: '+91', label: '+91 (IN)' },
                  { value: '+1', label: '+1 (US)' },
                  { value: '+44', label: '+44 (UK)' },
                  { value: '+971', label: '+971 (UAE)' },
                  { value: '+65', label: '+65 (SG)' },
                ]}
              />
              <Input
                id="pers-mobile-phone"
                type="tel"
                placeholder="e.g. 98765 43210"
                value={mobilePhone}
                onChange={(e) => setMobilePhone(e.target.value)}
              />
            </Inline>
          </FormField>

          {/* 19. Home Phone */}
          <FormField label="Home Phone" htmlFor="pers-home-phone">
            <Inline gap="xs">
              <Select
                value={homeCountryCode}
                onChange={(e) => setHomeCountryCode(e.target.value)}
                options={[
                  { value: '+91', label: '+91 (IN)' },
                  { value: '+1', label: '+1 (US)' },
                  { value: '+44', label: '+44 (UK)' },
                  { value: '+971', label: '+971 (UAE)' },
                ]}
              />
              <Input
                id="pers-home-phone"
                type="tel"
                placeholder="Landline number"
                value={homePhone}
                onChange={(e) => setHomePhone(e.target.value)}
              />
            </Inline>
          </FormField>

          {/* 20. Business Phone */}
          <FormField label="Business Phone" htmlFor="pers-business-phone">
            <Inline gap="xs">
              <Select
                value={businessCountryCode}
                onChange={(e) => setBusinessCountryCode(e.target.value)}
                options={[
                  { value: '+91', label: '+91 (IN)' },
                  { value: '+1', label: '+1 (US)' },
                  { value: '+44', label: '+44 (UK)' },
                  { value: '+971', label: '+971 (UAE)' },
                ]}
              />
              <Input
                id="pers-business-phone"
                type="tel"
                placeholder="Office extension"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
              />
            </Inline>
          </FormField>

          {/* 21. Work Phone */}
          <FormField label="Work Phone" htmlFor="pers-work-phone">
            <Inline gap="xs">
              <Select
                value={workCountryCode}
                onChange={(e) => setWorkCountryCode(e.target.value)}
                options={[
                  { value: '+91', label: '+91 (IN)' },
                  { value: '+1', label: '+1 (US)' },
                  { value: '+44', label: '+44 (UK)' },
                  { value: '+971', label: '+971 (UAE)' },
                ]}
              />
              <Input
                id="pers-work-phone"
                type="tel"
                placeholder="Direct work line"
                value={workPhone}
                onChange={(e) => setWorkPhone(e.target.value)}
              />
            </Inline>
          </FormField>

          {/* 22. Email Address */}
          <FormField
            label="Email Address"
            htmlFor="pers-email"
            required
            error={emailError || undefined}
          >
            <Input
              id="pers-email"
              type="email"
              placeholder="e.g. employee@company.com"
              value={email}
              onChange={handleEmailChange}
              error={emailError || undefined}
            />
          </FormField>
        </FormGrid>
      </FormSection>

      {/* SECTION 4: ADDRESS DETAILS */}
      <FormSection
        title="Address Details"
        description="Residential and permanent address information"
      >
        <FormGrid columns={2} layout="horizontal" labelWidth="md">
          {/* 23. Street (Full width) */}
          <FormField label="Street" htmlFor="pers-street" required span={2}>
            <Input
              id="pers-street"
              type="text"
              placeholder="Building, Flat No., Street, Area"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
            />
          </FormField>

          {/* 26. PIN Code */}
          <FormField
            label="PIN Code (India)"
            htmlFor="pers-pincode"
            required
            helperText={
              postalStatus
                ? `✓ ${postalStatus}`
                : postalLoading
                  ? 'Looking up PIN code...'
                  : undefined
            }
          >
            <Input
              id="pers-pincode"
              type="text"
              maxLength={6}
              placeholder="e.g. 600001"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
            />
          </FormField>

          {/* 24. City */}
          <FormField
            label="City"
            htmlFor="pers-city"
            required
            helperText={
              cityStatus
                ? `✓ ${cityStatus}`
                : cityLoading
                  ? 'Searching postal PIN code...'
                  : undefined
            }
          >
            <Stack gap="xs">
              <Input
                id="pers-city"
                type="text"
                placeholder="e.g. Hosur, Chennai, Tambaram"
                value={city}
                onChange={handleCityChange}
              />
              {availablePincodes.length > 1 && (
                <Select
                  value={pinCode}
                  onChange={(e) => {
                    setPinCode(e.target.value);
                    const sel = availablePincodes.find((p) => p.pincode === e.target.value);
                    if (sel) {
                      setCityStatus(`Selected PIN: ${sel.pincode} (${sel.name})`);
                    }
                  }}
                  options={[
                    { value: '', label: 'Select specific area PIN code...' },
                    ...availablePincodes.map((p) => ({
                      value: p.pincode,
                      label: `${p.pincode} - ${p.name}`,
                    })),
                  ]}
                />
              )}
            </Stack>
          </FormField>

          {/* District */}
          <FormField label="District" htmlFor="pers-district" required>
            <Input
              id="pers-district"
              type="text"
              placeholder="e.g. Krishnagiri, Chengalpattu"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            />
          </FormField>

          {/* 25. State */}
          <FormField label="State" htmlFor="pers-state" required>
            <Input
              id="pers-state"
              type="text"
              placeholder="e.g. Tamil Nadu"
              value={state}
              onChange={(e) => setState(e.target.value)}
            />
          </FormField>

          {/* 27. Country */}
          <FormField label="Country" htmlFor="pers-country" required>
            <Select
              id="pers-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              options={[
                { value: 'India', label: 'India' },
                { value: 'United States', label: 'United States' },
                { value: 'United Kingdom', label: 'United Kingdom' },
                { value: 'United Arab Emirates', label: 'United Arab Emirates' },
                { value: 'Singapore', label: 'Singapore' },
                { value: 'Australia', label: 'Australia' },
                { value: 'Canada', label: 'Canada' },
              ]}
            />
          </FormField>

          {/* Custom Fields in Address Details */}
          {renderCustomFieldsForCard('c_pers_address')}
        </FormGrid>
      </FormSection>

      {/* Render Newly Created Custom Cards */}
      {customCards
        .filter((c) => c.isCustom)
        .map((card) => {
          return (
            <FormSection key={card.id} title={card.title}>
              <FormGrid columns={2} layout="horizontal" labelWidth="md">
                {renderCustomFieldsForCard(card.id)}
              </FormGrid>
            </FormSection>
          );
        })}
    </Stack>
  );
}
