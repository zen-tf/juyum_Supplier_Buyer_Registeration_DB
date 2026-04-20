using { cuid, managed } from '@sap/cds/common';

entity RegistrationSessions : cuid, managed {
    userId           : String(100); // Joule에서 넘어오는 사용자 식별자
    status           : String(50) default 'INIT'; 
    /* [Status 종류]
      INIT: 초기 상태
      SUBJECT_CONFIRMED: 주체 확인 완료
      COUNTRY_CONFIRMED: 국가 및 정보 수집 완료
      COMPLETED: 프로세스 종료
    */
    roleType         : String(20);  // 'Buyer' 또는 'Supplier'
    isDomestic       : Boolean;     // true(국내), false(해외)
    companyName      : String(100);
    taxId            : String(50);  // 사업자등록번호 또는 Tax ID
    isErpRegistered  : Boolean;
    isAribaPending   : Boolean;
}