import { useActivePopUpsQuery } from "@/hooks/use-pop-ups";
import PopUpElement from "./PopUpElement";

const PopUpContainer = () => {
    const { data: popUps, isLoading, isError } = useActivePopUpsQuery();

    if (isLoading) return null;
    if (isError) return null;

    return (
        <div className="fixed bottom-4 right-4 flex flex-col gap-3 z-50">
            {popUps.data?.map((popUp) => (
                <PopUpElement
                    key={popUp.id}
                    title={popUp.title}
                    description={popUp.description}
                    type={popUp.type}
                    ctaLink={popUp.ctaLink}
                    ctaText={popUp.ctaText}
                    autoClose={popUp.autoClose}
                    duration={popUp.duration}
                />
            ))}
        </div>
    );
};

export default PopUpContainer;
